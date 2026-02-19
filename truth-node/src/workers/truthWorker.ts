import { Worker, Job } from 'bullmq';
import { redisConfig } from '../config/redis';
import { TRUTH_QUEUE_NAME, TruthJobData } from '../queues/truthQueue';
import { RecipeRegistry, RecipeInstance } from '@friehub/recipes';
import { getPublicClient, getWalletClient, getAccount } from '../config/viem';
import axios from 'axios';
import TruthOracleABI from '../abis/TruthOracle.json';
import { Hex, parseAbi } from 'viem';
import { ZKProverService } from '../services/ZKProverService';
import { logger } from '../config/logger';
import { resolutionStatus, resolutionDuration, walletBalance } from '../config/metrics';
import { NodeHealthService } from '../services/NodeHealthService';

const MAX_CONTRACT_RETRIES = 5;
const INITIAL_BACKOFF_MS = 1000;

async function withContractRetry<T>(fn: () => Promise<T>, description: string, reqId?: string): Promise<T> {
    let lastError: any;
    for (let i = 0; i < MAX_CONTRACT_RETRIES; i++) {
        try {
            return await fn();
        } catch (err: any) {
            lastError = err;
            const delay = INITIAL_BACKOFF_MS * Math.pow(2, i);
            logger.warn({ requestId: reqId, attempt: i + 1, delay, err: err.message }, `[Worker] ${description} failed. Retrying...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    throw lastError;
}

// Core Verification Logic (Standalone for both BullMQ and Lite Mode)
export async function processVerification(data: TruthJobData, jobId?: string) {
    const { requestId, recipeId, inputs, chainId, legacy } = data;
    const startTime = Date.now();
    const log = logger.child({ requestId, jobId, chainId });
    log.info({ recipeId, legacy }, 'Processing verification job');

    try {
        // 1. Resolve Template
        const template = await RecipeRegistry.getInstance().get(recipeId);
        if (!template) {
            throw new Error(`Template ${recipeId} not found in registry.`);
        }

        log.info({ templateName: template.metadata?.name }, '[Worker] Starting Local Sovereign Verification...');

        // 1b. Configure Proxy Mode for Sovereign Logic (Keyless)
        // This ensures that when StandardFeedPlugin runs, it bootstraps the registry in "Proxy Mode"
        // if the node doesn't have local API keys.
        process.env.TAAS_USE_PROXY = process.env.TAAS_USE_PROXY || 'true';
        process.env.TAAS_PROXY_URL = process.env.TAAS_PROXY_URL || (process.env.INDEXER_API_URL || 'http://localhost:3002');

        // 2. Execute Logic Locally
        // Instead of calling axios.post('/verify'), we run the engine right here.
        // The node IS the computer.
        const { RecipeExecutor } = await import('@friehub/execution-engine');

        // We must cast the template to the Recipe type expected by the executor
        // Usually RecipeInstance.toRecipe() handles this, but here we might have the raw JSON
        const recipeInstance = new RecipeInstance(template);
        const recipe = recipeInstance.toRecipe();

        const executionResult = await RecipeExecutor.execute(recipe as any, inputs || {});

        if (!executionResult.success) {
            throw new Error(`Local verification failed for ${requestId}`);
        }

        const result = executionResult;

        log.info({ outcome: result.winningOutcome, signature: result.signature }, 'Local Execution Successful');

        if (result.winningOutcome === null || result.winningOutcome === undefined) {
            throw new Error(`Outcome is null/undefined. Logic failed for ${requestId}`);
        }

        // 2.5 Generate AaaS Truth Certificate (Audit-as-a-Service)
        const { TruthCertificateService } = await import('../services/TruthCertificateService');
        const certificate = await TruthCertificateService.generate(requestId, recipeId, result);
        const ipfsHash = await TruthCertificateService.uploadToIPFS(certificate);
        log.info({ ipfsHash }, 'Truth Certificate generated and uploaded');

        // 3. Propose on-chain
        const publicClient = getPublicClient(chainId);
        const walletClient = getWalletClient(chainId);
        const account = getAccount();
        const { config } = await import('../config/env');
        const ORACLE_ADDRESS = config.ORACLE_ADDRESS as Hex;
        const TOKEN_ADDRESS = config.TOKEN_ADDRESS as Hex;

        const bond = await publicClient.readContract({
            address: ORACLE_ADDRESS,
            abi: TruthOracleABI.abi,
            functionName: 'minimumBond'
        }) as bigint;

        //  Check if node is certified
        const isCertified = await publicClient.readContract({
            address: ORACLE_ADDRESS,
            abi: TruthOracleABI.abi,
            functionName: 'certifiedNodes',
            args: [account.address]
        }) as boolean;

        // Update wallet balance metric (T Token)
        const tBalance = await publicClient.readContract({
            address: TOKEN_ADDRESS,
            abi: parseAbi(['function balanceOf(address) view returns (uint256)']),
            functionName: 'balanceOf',
            args: [account.address]
        }) as bigint;
        walletBalance.set({ chainId, address: account.address }, Number(tBalance) / 1e18);

        // ============ ZK PROOF GENERATION (V2.5) ============
        // Now that we have local execution traces, we can generate the ZK Input
        try {
            const zkInput = await ZKProverService.prepareInput(recipeId, result);
            log.info({
                mode: zkInput.mode,
                dataHash: zkInput.dataHash,
                values: zkInput.values.length
            }, '[ZK] Input Prepared from Local Trace');

            // In a real production node, we would call generateProof(zkInput) here
            // For now, we just verify the input structure is correct
        } catch (zkError: any) {
            logger.warn({ err: zkError.message }, '[ZK] Failed to prepare ZK input (Skipping for now)');
        }

        // ============ V2 RICH OUTCOME PROPOSAL ============

        // Import V2 utilities
        const { getOutcomeTypeEnum, encodeOutcomeData } = await import('../utils/outcomeEncoding');
        const { signOutcomeAttestation } = await import('../utils/attestation');

        const finalIpfsHash = ipfsHash || result.proof?.recipeHash || 'v4-async-discovery';

        // 1. Determine outcome type from template
        const outcomeType = getOutcomeTypeEnum((template as any).outcomeType || 'BINARY');
        log.info({ outcomeType, outcomeTypeString: (template as any).outcomeType }, 'Determined outcome type');

        // 2. Encode outcome data for V2 contract
        const outcomeData = encodeOutcomeData(
            (template as any).outcomeType || 'BINARY',
            result.winningOutcome,
            result
        );
        log.info({ outcomeDataLength: outcomeData.length }, 'Outcome encoded for V2');

        // 3. Generate EIP-712 signature (attestation)
        const attestation = await signOutcomeAttestation({
            requestId: requestId as Hex,
            outcomeType,
            outcomeData,
            timestamp: BigInt(Date.now())
        });
        log.info('Attestation signature generated');

        // 4. Handle bond approval for non-certified nodes
        if (!isCertified) {
            log.info({ node: account.address, bond: bond.toString(), balance: tBalance.toString() }, 'Node is NOT certified. No bond required for TruthOracleV2 (uses $T staking)');

            // V2 doesn't require upfront bond, but log balance for monitoring
            if (tBalance < bond) {
                log.warn({ required: bond.toString(), have: tBalance.toString() }, 'Low $T balance - should stake for reputation');
            }
        } else {
            log.info({ node: account.address }, 'Node is certified. Free proposal.');
        }

        // 5. Propose rich outcome to TruthOracleV2
        log.info({
            outcomeType,
            ipfsHash: finalIpfsHash,
            isCertified
        }, 'Proposing rich outcome to TruthOracleV2...');

        const hash = await withContractRetry(async () => {
            return await walletClient.writeContract({
                address: ORACLE_ADDRESS,
                abi: parseAbi([
                    'function proposeRichOutcome(bytes32 requestId, uint8 outcomeType, bytes calldata outcomeData, string calldata ipfsHash, bytes calldata attestation) external payable'
                ]),
                functionName: 'proposeRichOutcome',
                args: [
                    requestId as Hex,
                    outcomeType,
                    outcomeData,
                    finalIpfsHash,
                    attestation
                ],
                value: isCertified ? 0n : bond, // Certified nodes skip bond
                account,
                chain: publicClient.chain
            });
        }, 'proposeRichOutcome', requestId);

        log.info({ tx: hash }, 'Proposal Successful');

        // Record success metrics
        resolutionStatus.inc({ status: 'completed', chainId });
        resolutionDuration.observe({ chainId }, (Date.now() - startTime) / 1000);

        // 6. Report success to Sovereign Backend
        await NodeHealthService.reportMetric(true);

        return { success: true, txHash: hash, outcome: result.winningOutcome };

    } catch (err: any) {
        log.error({ err: err.message }, 'job failed');

        // Report failure to Sovereign Backend
        await NodeHealthService.reportMetric(false);

        // Record failure metric
        resolutionStatus.inc({ status: 'failed', chainId });

        throw err;
    }
}

// Start Worker
export const startWorkerEngine = async (): Promise<Worker> => {
    const worker = new Worker<TruthJobData>(
        TRUTH_QUEUE_NAME,
        async (job: Job<TruthJobData>) => {
            return await processVerification(job.data, job.id);
        },
        {
            connection: redisConfig,
            concurrency: 5 // Handle 5 verifications in parallel per worker process
        }
    );

    worker.on('completed', (job: Job<TruthJobData>) => {
        logger.info({ jobId: job.id }, '[Worker] Job completed successfully.');
    });

    worker.on('failed', (job: Job<TruthJobData> | undefined, err: Error) => {
        logger.error({ jobId: job?.id, err: err.message }, '[Worker] Job failed');
    });

    logger.info('[Worker] Truth Verification Worker started. (Concurrency: 5)');
    return worker;
};
