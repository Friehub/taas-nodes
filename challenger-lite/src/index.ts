import { createPublicClient, http, parseAbiItem } from 'viem';
import { polygon } from 'viem/chains';
import { RecipeRegistry, RecipeInstance } from '@friehub/recipes';
import dotenv from 'dotenv';
import chalk from 'chalk';
import axios from 'axios';

import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../../../.env') });
dotenv.config();

const RPC_URL = process.env.RPC_URL || 'https://polygon-rpc.com';
const ORACLE_ADDRESS = process.env.ORACLE_ADDRESS as `0x${string}`;
const GATEWAY_URL = process.env.INDEXER_API_URL || 'http://localhost:3002';

const publicClient = createPublicClient({
    chain: polygon, // Default to polygon, can be dynamic
    transport: http(RPC_URL)
});

const PROPOSAL_EVENT = parseAbiItem('event OutcomeProposed(bytes32 indexed queryId, uint256 outcome, address proposer, uint256 timestamp, string recipeId, string inputsJson)');

/**
 * FrieHub Challenger Node
 * Permissionless monitoring and dispute service.
 */
async function startChallenger() {
    console.log(chalk.bold.blue('\n  FrieHub Challenger Node Starting...'));
    console.log(chalk.bold.blue('\n  FrieHub Challenger Node Starting...'));
    console.log(chalk.gray(`  Monitoring Oracle: ${ORACLE_ADDRESS}\n`));

    // 1. Listen for Proposals
    // 1. Listen for Proposals
    console.log(chalk.yellow('  Listening for on-chain truth proposals...'));

    publicClient.watchEvent({
        address: ORACLE_ADDRESS,
        event: PROPOSAL_EVENT,
        onLogs: async (logs) => {
            for (const log of logs) {
                const { queryId, outcome, recipeId, inputsJson } = log.args as any;
                console.log(chalk.cyan(`\n  New Proposal Detected!`));
                console.log(`QueryID: ${queryId}`);
                console.log(`Proposed Outcome: ${outcome}`);
                console.log(`Template: ${recipeId}`);

                try {
                    // 2. Re-verify independently
                    const inputs = JSON.parse(inputsJson || '{}');
                    const templateData = RecipeRegistry.getById(recipeId);

                    if (!templateData) {
                        console.warn(chalk.red(`  Template ${recipeId} not found in local registry. Cannot verify.`));
                        continue;
                    }

                    const template = new RecipeInstance(templateData);
                    console.log(chalk.gray(`  Requesting sovereign gate verification...`));

                    // Call the Sovereign Gateway instead of local executor
                    const response = await axios.post(`${GATEWAY_URL}/proxy/verify`, {
                        template: templateData,
                        inputs
                    });

                    const result = response.data.result;

                    console.log(chalk.green(`  Independent Verification Finished.`));
                    console.log(`Gateway Outcome: ${result.winningOutcome}`);

                    // 3. Check for discrepancy
                    if (Number(result.winningOutcome) !== Number(outcome)) {
                        console.log(chalk.bold.red(`  DISCREPANCY FOUND!`));
                        console.log(chalk.red(`Blockchain: ${outcome} vs Local: ${result.winningOutcome}`));

                        await triggerDispute(queryId, result.winningOutcome);
                    } else {
                        console.log(chalk.green(`  Proposal matches local verification. No action needed.`));
                    }

                } catch (e: any) {
                    console.error(chalk.red(`  Verification Error: ${e.message}`));
                }
            }
        }
    });
}

import { submitDispute } from './dispute';

async function triggerDispute(queryId: string, locallyVerifiedOutcome: any) {
    console.log(chalk.bold.magenta(`  Triggering Dispute for Query: ${queryId}`));
    console.log(chalk.gray(`  Reason: Local verification mismatch.`));

    await submitDispute(queryId, locallyVerifiedOutcome);
}

startChallenger().catch(err => {
    console.error(chalk.bold.red('FATAL ERROR:'), err);
});
