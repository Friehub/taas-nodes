import { type Hex } from 'viem';
import { getHeliosPublicClient, getHeliosWalletClient, getAccount } from '../config/viem';
import TruthOracleABI from '../lib/abi/TruthOracleV2.json';
import { RecipeRegistry, RecipeInstance } from '@friehub/recipes';
import axios from 'axios';
import { StateStore } from './StateStore';
import { logger } from '../config/logger';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const ORACLE_ADDRESS = process.env.ORACLE_ADDRESS as Hex;

/**
 * ChallengerBot
 * 
 * Monitors the TruthOracle for proposals and automatically re-verifies them.
 * If the re-verified outcome differs from the proposed outcome, it triggers a dispute.
 */
export class ChallengerBot {
    static async start() {
        if (!ORACLE_ADDRESS) {
            logger.error('[ChallengerBot]  ORACLE_ADDRESS not configured');
            return;
        }

        logger.info({ address: ORACLE_ADDRESS }, '[ChallengerBot] Monitoring TruthOracle for disputes...');

        const client = getHeliosPublicClient();
        client.watchContractEvent({
            address: ORACLE_ADDRESS,
            abi: TruthOracleABI.abi,
            eventName: 'OutcomeProposed',
            onLogs: (logs: any[]) => {
                logs.forEach(async (log) => {
                    const { requestId, outcome, proposer } = log.args;
                    const account = getAccount();

                    // 1. Don't challenge our own proposals
                    if (proposer.toLowerCase() === account.address.toLowerCase()) {
                        return;
                    }

                    // 2. Acquisition Check: Ensure no other challenger is already working on this
                    const lockKey = `challenger:lock:${requestId.toLowerCase()}`;
                    const acquired = await StateStore.setNX(lockKey, 'processing', 300); // 5 min lock
                    if (!acquired) {
                        logger.debug({ requestId }, '[ChallengerBot] Another instance is already re-verifying this request.');
                        return;
                    }

                    await this.challengeIfInvalid(requestId, outcome);
                });
            }
        });
    }

    private static async challengeIfInvalid(requestId: Hex, proposedOutcome: bigint) {
        const logContext = logger.child({ requestId });
        logContext.info('Re-verifying proposal...');

        try {
            const client = getHeliosPublicClient();
            // 1. Fetch original request data from contract
            const request = await client.readContract({
                address: ORACLE_ADDRESS,
                abi: TruthOracleABI.abi,
                functionName: 'requests',
                args: [requestId]
            }) as any;

            const extraData = request[7]; // extraData is at index 7 in the struct

            if (!extraData || extraData === '0x') {
                logContext.warn('No extraData found. Cannot verify.');
                return;
            }

            // 2. Decode recipeId and inputs
            let recipeId: string;
            let inputs: Record<string, any> = {};

            try {
                const decoded = (await import('viem')).decodeAbiParameters((await import('viem')).parseAbiParameters('string, string'), extraData);
                recipeId = decoded[0];
                inputs = JSON.parse(decoded[1]);
            } catch (err) {
                // Fallback to raw string if decoding fails
                recipeId = Buffer.from(extraData.slice(2), 'hex').toString('utf8').replace(/\0/g, '');
            }

            // 3. Resolve Template and Execute
            const template = await RecipeRegistry.getById(recipeId);
            if (!template) {
                logContext.error({ recipeId }, 'Template not found');
                return;
            }

            logger.info({ requestId, recipeId }, '[ChallengerBot] Requesting Sovereign Verification from Gateway');

            const response = await axios.post(`${process.env.INDEXER_API_URL || 'http://localhost:3002'}/proxy/verify`, {
                template: template,
                inputs
            });

            const result = response.data.result;

            if (!result.success) {
                logContext.error('Verification failed');
                return;
            }

            const myOutcome = BigInt(result.winningOutcome as number);

            // 4. Compare Outcomes
            if (myOutcome !== proposedOutcome) {
                logContext.warn({ proposed: proposedOutcome.toString(), calculated: myOutcome.toString() }, 'DISCREPANCY DETECTED!');
                await this.triggerDispute(requestId);
            } else {
                logContext.info('Proposal matches local resolution.');
            }

        } catch (error: any) {
            logContext.error({ err: error.message }, 'Error challenging');
        }
    }

    private static async triggerDispute(requestId: Hex) {
        logger.info({ requestId }, 'Triggering dispute...');

        try {
            const client = getHeliosPublicClient();
            const wallet = getHeliosWalletClient();
            const account = getAccount();

            // Fetch required bond for dispute
            const request = await client.readContract({
                address: ORACLE_ADDRESS,
                abi: TruthOracleABI.abi,
                functionName: 'requests',
                args: [requestId]
            }) as any;

            const originalBond = request[2]; // bond is at index 2
            const minimumBond = await client.readContract({
                address: ORACLE_ADDRESS,
                abi: TruthOracleABI.abi,
                functionName: 'minimumBond'
            }) as bigint;

            const requiredBond = originalBond > 0n ? originalBond : minimumBond;

            logger.info({ requestId, bond: requiredBond.toString() }, 'Sending dispute transaction...');

            const { request: disputeRequest } = await client.simulateContract({
                address: ORACLE_ADDRESS,
                abi: TruthOracleABI.abi,
                functionName: 'disputeTruth',
                args: [requestId],
                account,
                value: requiredBond
            });

            const hash = await wallet.writeContract(disputeRequest);
            logger.info({ tx: hash }, 'Dispute successful');

        } catch (error: any) {
            logger.error({ requestId, err: error.message }, 'Failed to trigger dispute');
        }
    }
}
