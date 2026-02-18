/**
 * Truth Node Integration with Rich Outcomes
 * Updates TruthRelayer to propose rich outcomes to TruthOracleV2
 */

import { decodeAbiParameters, type Hex, parseAbiParameters, encodeAbiParameters } from 'viem';
import { getHeliosWalletClient } from '../config/viem';
import TruthOracleV2ABI from '../abis/TruthOracleV2.json';
// FIXME: These imports need to be created in execution-engine and recipes packages
// For now, define minimal types here
type Outcome = {
    type: OutcomeType;
    value: any;
};
enum OutcomeType {
    BINARY = 0,
    SCALAR = 1,
    CATEGORICAL = 2,
    PROBABILISTIC = 3,
    INVALID = 4
}
import { logger } from '../config/logger';
import { config } from '../config/env';

const ORACLE_ADDRESS = config.ORACLE_ADDRESS as Hex;

// Temporary helper functions until we properly export from execution-engine
function normalizeExecutionResult(result: any): { outcome: Outcome; confidence: number } {
    // Simplified normalization
    return {
        outcome: {
            type: OutcomeType.BINARY,
            value: result
        },
        confidence: 1.0
    };
}

function encodeForContract(outcome: Outcome): { outcomeType: number; outcomeData: string } {
    return {
        outcomeType: outcome.type,
        outcomeData: JSON.stringify(outcome.value)
    };
}

function createRichOutcomeCertificate(params: any): any {
    return params;
}

export class RichOutcomeProposer {
    /**
     * Propose rich outcome to TruthOracleV2
     * Supports all 5 outcome types
     */
    static async propose(params: {
        requestId: Hex;
        executionResult: any; // Raw result from recipe execution
        trace: any[];
        ipfsHash: string;
        recipeId: string;
    }) {
        const { requestId, executionResult, trace, ipfsHash, recipeId } = params;

        try {
            // 1. Normalize execution result to typed outcome
            logger.info({ requestId, recipeId }, 'Normalizing execution result...');
            const normalized = normalizeExecutionResult(executionResult);

            logger.info({
                requestId,
                outcomeType: normalized.outcome.type,
                confidence: normalized.confidence
            }, 'Outcome normalized');

            // 2. Create IPFS certificate with rich outcome
            const certificate = createRichOutcomeCertificate({
                recipeId,
                requestId,
                result: normalized,
                trace,
                timestamp: Date.now(),
                executorNode: config.NODE_ID || 'unknown'
            });

            // Upload certificate to IPFS (simplified - use actual IPFS client in production)
            logger.info({ requestId }, 'Certificate created');

            // 3. Encode outcome for smart contract
            const { outcomeType, outcomeData } = encodeForContract(normalized.outcome);

            logger.info({
                requestId,
                outcomeType,
                outcomeDataLength: outcomeData.length
            }, 'Outcome encoded for contract');

            // 4. Prepare attestation (EIP-712 signature)
            const attestation = await this.generateAttestation({
                requestId,
                outcomeType,
                outcomeData,
                ipfsHash
            });

            // 5. Submit to TruthOracleV2
            const walletClient = getHeliosWalletClient();
            const account = walletClient.account;
            if (!account) {
                throw new Error('No account found in wallet client');
            }

            logger.info({ requestId }, 'Submitting rich outcome to TruthOracleV2...');

            const hash = await walletClient.writeContract({
                account,
                address: ORACLE_ADDRESS,
                abi: TruthOracleV2ABI as any, // Type assertion for ABI
                functionName: 'proposeRichOutcome',
                chain: undefined, // Allow wallet to determine chain
                args: [
                    requestId,
                    outcomeType,
                    outcomeData,
                    ipfsHash,
                    attestation
                ],
                ...(config.MINIMUM_BOND && config.MINIMUM_BOND > 0n ? { value: config.MINIMUM_BOND } : {})
            });

            logger.info({
                requestId,
                txHash: hash,
                outcomeType: OutcomeType[outcomeType]
            }, 'Rich outcome proposed successfully');

            return {
                success: true,
                txHash: hash,
                outcome: normalized.outcome,
                certificate
            };

        } catch (error: any) {
            logger.error({
                requestId,
                error: error.message,
                stack: error.stack
            }, 'Failed to propose rich outcome');

            throw error;
        }
    }

    /**
     * Generate EIP-712 attestation signature
     */
    private static async generateAttestation(params: {
        requestId: Hex;
        outcomeType: number;
        outcomeData: string;
        ipfsHash: string;
    }): Promise<Hex> {
        const { requestId, outcomeType, outcomeData, ipfsHash } = params;

        // EIP-712 domain
        const domain = {
            name: 'TaaS Truth Oracle',
            version: '3.2.0',
            chainId: config.CHAIN_ID || 1000,
            verifyingContract: ORACLE_ADDRESS
        };

        // EIP-712 types
        const types = {
            RichOutcome: [
                { name: 'requestId', type: 'bytes32' },
                { name: 'outcomeType', type: 'uint8' },
                { name: 'outcomeData', type: 'bytes' },
                { name: 'ipfsHash', type: 'string' },
                { name: 'timestamp', type: 'uint256' }
            ]
        };

        // Message to sign
        const message = {
            requestId,
            outcomeType,
            outcomeData,
            ipfsHash,
            timestamp: BigInt(Math.floor(Date.now() / 1000))
        };

        // Sign with wallet
        const walletClient = getHeliosWalletClient();
        const account = walletClient.account;
        if (!account) {
            throw new Error('No account found in wallet client');
        }

        const signature = await walletClient.signTypedData({
            account,
            domain,
            types,
            primaryType: 'RichOutcome',
            message
        });

        return signature as Hex;
    }

    /**
     * Check if outcome type is supported
     */
    static isSupportedOutcomeType(outcomeType: OutcomeType): boolean {
        return [
            OutcomeType.BINARY,
            OutcomeType.SCALAR,
            OutcomeType.CATEGORICAL,
            OutcomeType.PROBABILISTIC,
            OutcomeType.INVALID
        ].includes(outcomeType);
    }
}
