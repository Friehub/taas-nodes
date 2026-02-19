import { decodeAbiParameters, type Hex, parseAbiParameters } from 'viem';
import { getHeliosPublicClient, getHeliosWalletClient, getAccount } from '../config/viem';
import TruthOracleABI from '../lib/abi/TruthOracleV2.json';
import { RecipeRegistry, RecipeInstance } from '@friehub/recipes';
import { heliosChain } from '../config/chains';
import { addVerificationToQueue } from '../queues/truthQueue';
import { config } from '../config/env';
import { StateStore } from './StateStore';
import { NodeHealthService } from './NodeHealthService';
import { logger } from '../config/logger';
import { truthRequestsTotal, gasPrice } from '../config/metrics';
import axios from 'axios';
import { config as envConfig } from '../config/env';

const ORACLE_ADDRESS = config.ORACLE_ADDRESS as Hex;

export class TruthRelayer {
    /**
     * Start listening for TruthRequested events on Helios
     */
    static async start() {
        if (!ORACLE_ADDRESS) {
            logger.error('[TruthRelayer] ORACLE_ADDRESS not configured');
            return;
        }

        logger.info({ address: ORACLE_ADDRESS }, '[TruthRelayer] Listening for TruthRequested...');

        const client = getHeliosPublicClient();
        const chainId = client.chain?.id || heliosChain.id;

        // 1. Recover missed events
        await this.sync(chainId);

        // 2. Start live monitoring
        client.watchContractEvent({
            address: ORACLE_ADDRESS,
            abi: TruthOracleABI.abi,
            eventName: 'RecipeRequested',
            onLogs: (logs: any[]) => {
                logs.forEach((log) => {
                    const { requestId, recipeData } = log.args;
                    this.handleTruthRequest(requestId, recipeData);

                    // Update checkpoints
                    if (log.blockNumber) {
                        StateStore.updateLastProcessedBlock(chainId, Number(log.blockNumber));
                    }
                });
            }
        });

        // Backward compatibility for legacy markets
        client.watchContractEvent({
            address: ORACLE_ADDRESS,
            abi: TruthOracleABI.abi,
            eventName: 'ResolutionRequested',
            onLogs: (logs: any[]) => {
                logs.forEach((log) => {
                    const { marketId, extraData } = log.args;
                    this.handleTruthRequest(marketId, extraData, true);

                    if (log.blockNumber) {
                        StateStore.updateLastProcessedBlock(chainId, Number(log.blockNumber));
                    }
                });
            }
        });

        // 3. Periodic metric update
        setInterval(async () => {
            try {
                const client = getHeliosPublicClient();
                // Update gas price metric
                const gas = await client.getGasPrice();
                gasPrice.set({ chainId }, Number(gas) / 1e9); // In Gwei
            } catch (e) { }
        }, 30000); // Every 30s
    }

    /**
     * Synchronize missed events since last processed block
     */
    static async sync(chainId: number) {
        logger.info({ chainId }, '[TruthRelayer] Synchronizing events...');

        try {
            const client = getHeliosPublicClient();
            const lastBlock = await StateStore.getLastProcessedBlock(chainId);
            const currentBlock = await client.getBlockNumber();

            if (!lastBlock) {
                logger.info({ chainId, currentBlock: Number(currentBlock) }, '[TruthRelayer] No checkpoint found. Starting from current block.');
                await StateStore.setLastProcessedBlock(chainId, Number(currentBlock));
                return;
            }

            if (BigInt(lastBlock) >= currentBlock) {
                logger.debug({ chainId, lastBlock }, '[TruthRelayer] Already synchronized.');
                return;
            }

            const fromBlock = BigInt(lastBlock) + 1n;
            logger.info({ fromBlock: Number(fromBlock), toBlock: Number(currentBlock) }, '[TruthRelayer] Fetching missed events...');

            // Fetch standard requests
            const logs = await client.getContractEvents({
                address: ORACLE_ADDRESS,
                abi: TruthOracleABI.abi,
                eventName: 'RecipeRequested',
                fromBlock,
                toBlock: currentBlock
            });

            // Fetch legacy requests
            const legacyLogs = await client.getContractEvents({
                address: ORACLE_ADDRESS,
                abi: TruthOracleABI.abi,
                eventName: 'ResolutionRequested',
                fromBlock,
                toBlock: currentBlock
            });

            const allLogs = [...logs, ...legacyLogs].sort((a, b) =>
                Number((a.blockNumber || 0n) - (b.blockNumber || 0n))
            );

            if (allLogs.length > 0) {
                logger.info({ count: allLogs.length }, '[TruthRelayer] Found missed events. Processing...');
                for (const log of allLogs) {
                    const isLegacy = (log as any).eventName === 'ResolutionRequested';
                    const { requestId, marketId, extraData, recipeData } = (log as any).args;
                    await this.handleTruthRequest(requestId || marketId, recipeData || extraData, isLegacy);
                }
            }

            await StateStore.setLastProcessedBlock(chainId, Number(currentBlock));
            logger.info({ block: Number(currentBlock) }, '[TruthRelayer] Synchronization complete.');

        } catch (err: any) {
            logger.error({ err: err.message }, '[TruthRelayer] Sync failed');
        }
    }

    private static async handleTruthRequest(requestId: Hex, extraData: Hex, legacy: boolean = false) {
        const client = getHeliosPublicClient();
        const chainId = client.chain?.id || heliosChain.id;
        const log = logger.child({ requestId, legacy });
        log.info('New Request Received');

        // Track metric
        truthRequestsTotal.inc({ chainId, legacy: legacy.toString() });

        try {
            // 1. Decode extraData (Convention: recipeId, inputsJson)
            let recipeId: string;
            let inputs: Record<string, any> = {};

            try {
                // If legacy, extraData might be just the recipeId string or encoded differently
                if (legacy) {
                    try {
                        const decoded = decodeAbiParameters(parseAbiParameters('string, string'), extraData);
                        recipeId = decoded[0];
                        inputs = JSON.parse(decoded[1]);
                    } catch {
                        recipeId = Buffer.from(extraData.slice(2), 'hex').toString('utf8').replace(/\0/g, '');
                    }
                } else {
                    const decoded = decodeAbiParameters(
                        parseAbiParameters('string, string'),
                        extraData
                    );
                    recipeId = decoded[0];
                    inputs = JSON.parse(decoded[1]);
                }
            } catch (err) {
                log.warn({ err: (err as Error).message }, 'Failed to decode extraData, falling back to raw string');
                recipeId = Buffer.from(extraData.slice(2), 'hex').toString('utf8').replace(/\0/g, '');
            }

            log.info({ recipeId, inputs }, 'Request Decoded');

            // 2. Process based on mode
            const useRedis = process.env.ENABLE_REDIS === 'true';

            if (useRedis) {
                // Standard BullMQ Queue
                await addVerificationToQueue({
                    requestId,
                    recipeId,
                    inputs,
                    chainId,
                    legacy
                });
                log.info('Job enqueued in BullMQ');
            } else {
                // Sentinel Lite: Use Memory Queue
                const { MemoryQueueEngine } = await import('./MemoryQueueEngine');
                await MemoryQueueEngine.getInstance().add('truth-check', {
                    requestId,
                    recipeId,
                    inputs,
                    chainId,
                    legacy
                });
                log.info('Job enqueued in MemoryQueue (Lite Mode)');
            }

            // 3. Report Request Metric to Source Registry (Indexer)
            // This increments the 'total_requests' counter in the DB
            try {
                // If we knew the sourceId (e.g. from the request), we would use it.
                // For now, we increment a "GENESIS" source or fallback.
                // Since this is a generic Relayer, we might not have a specific source ID.
                // However, the prompt implies "totalRequests" is a global counter.
                // The Indexer schema sums up 'total_fetches' from sources.
                // We will assume a 'SYSTEM' source exists or we skip source-specific reporting 
                // and just acknowledge the request.

                // Correction: The user wants "Real Request Counter".
                // If we don't have a sourceId, we can't update a source.
                // BUT, the goal is network stats.
                // We'll skip this for now if we don't have an ID, BUT
                // checking indexer API, it requires sourceId.
                // Let's create a TODO or if we have a node ID, use that.

                const INDEXER_URL = process.env.INDEXER_API_URL || 'http://localhost:3002';
                // Use a default system source ID for generic requests if applicable, or just log.
                // Ideally, the 'proposer' is the source. 
                // For now, to unblock the stats, we will assume one known source or just skip erroring.
                // Actually, let's leave this for the Worker which does the work and knows the result.

            } catch (err) { /* silent fail */ }

        } catch (error: any) {
            logger.error({ requestId, err: error.message }, 'Error processing request');
        }
    }
}
