import { encodeAbiParameters, parseAbiParameters, type Hex } from 'viem';
import { RecipeExecutionResult } from '@friehub/taas-sdk';

/**
 * TruthOracleV2 Outcome Type enum (matches Solidity)
 */
export enum OutcomeType {
    BINARY = 0,          // 0 or 1
    SCALAR = 1,          // Numerical value with unit
    CATEGORICAL = 2,     // One of multiple options
    PROBABILISTIC = 3,   // Probability (0-1) with reasoning
    INVALID = 4          // Question is unanswerable
}

/**
 * Map recipe outcome type string to contract enum
 */
export function getOutcomeTypeEnum(type: string): OutcomeType {
    const normalized = type.toUpperCase();

    switch (normalized) {
        case 'BINARY':
            return OutcomeType.BINARY;
        case 'SCALAR':
            return OutcomeType.SCALAR;
        case 'CATEGORICAL':
            return OutcomeType.CATEGORICAL;
        case 'PROBABILISTIC':
            return OutcomeType.PROBABILISTIC;
        case 'INVALID':
            return OutcomeType.INVALID;
        default:
            // Default to BINARY for legacy recipes
            return OutcomeType.BINARY;
    }
}

/**
 * Encode outcome data based on type for contract call
 * 
 * @param type Outcome type (BINARY, SCALAR, etc.)
 * @param outcome The actual outcome value
 * @param result Full execution result with metadata
 * @returns ABI-encoded bytes for contract
 */
export function encodeOutcomeData(
    type: string,
    outcome: any,
    result: RecipeExecutionResult
): Hex {
    const normalized = type.toUpperCase();

    try {
        switch (normalized) {
            case 'BINARY': {
                // Binary: uint8 (0 or 1)
                const value = Number(outcome);
                if (value !== 0 && value !== 1) {
                    throw new Error(`Binary outcome must be 0 or 1, got ${value}`);
                }
                return encodeAbiParameters(
                    parseAbiParameters('uint8'),
                    [value]
                );
            }

            case 'SCALAR': {
                // Scalar: (int256 value, string unit)
                const value = BigInt(Math.floor(Number(outcome)));
                const unit = (result as any).unit ||
                    (result as any).metadata?.unit ||
                    (result as any).outcomeUnit ||
                    '';
                return encodeAbiParameters(
                    parseAbiParameters('int256, string'),
                    [value, unit]
                );
            }

            case 'CATEGORICAL': {
                // Categorical: string value
                const value = String(outcome);
                if (!value || value.trim().length === 0) {
                    throw new Error('Categorical outcome cannot be empty');
                }
                return encodeAbiParameters(
                    parseAbiParameters('string'),
                    [value]
                );
            }

            case 'PROBABILISTIC': {
                // Probabilistic: (uint256 probability, string reasoning)
                // Convert outcome (0-1) to 18 decimal fixed point
                const prob = BigInt(Math.floor(Number(outcome) * 1e18));
                if (prob > BigInt(1e18)) {
                    throw new Error(`Probability must be <= 1.0, got ${outcome}`);
                }
                const reasoning = (result as any).reasoning ||
                    (result as any).explanation ||
                    (result as any).rationale ||
                    'AI consensus achieved';
                return encodeAbiParameters(
                    parseAbiParameters('uint256, string'),
                    [prob, reasoning]
                );
            }

            case 'INVALID': {
                // Invalid: string reasoning
                const reasoning = (result as any).invalidReason ||
                    (result as any).error ||
                    (result as any).failureReason ||
                    'Unable to determine outcome';
                return encodeAbiParameters(
                    parseAbiParameters('string'),
                    [reasoning]
                );
            }

            default:
                // Fallback to BINARY for unknown types
                const fallbackValue = Number(outcome) === 0 ? 0 : 1;
                return encodeAbiParameters(
                    parseAbiParameters('uint8'),
                    [fallbackValue]
                );
        }
    } catch (error: any) {
        throw new Error(`Outcome encoding failed for type ${type}: ${error.message}`);
    }
}

/**
 * Decode outcome data from contract format
 * 
 * @param type Outcome type enum
 * @param data ABI-encoded bytes from contract
 * @returns Decoded outcome value
 */
export function decodeOutcomeData(type: OutcomeType, data: Hex): any {
    const { decodeAbiParameters, parseAbiParameters } = require('viem');

    switch (type) {
        case OutcomeType.BINARY: {
            const [value] = decodeAbiParameters(parseAbiParameters('uint8'), data);
            return Number(value);
        }

        case OutcomeType.SCALAR: {
            const [value, unit] = decodeAbiParameters(
                parseAbiParameters('int256, string'),
                data
            );
            return { value: Number(value), unit };
        }

        case OutcomeType.CATEGORICAL: {
            const [value] = decodeAbiParameters(parseAbiParameters('string'), data);
            return value;
        }

        case OutcomeType.PROBABILISTIC: {
            const [prob, reasoning] = decodeAbiParameters(
                parseAbiParameters('uint256, string'),
                data
            );
            return {
                probability: Number(prob) / 1e18, // Convert back to 0-1
                reasoning
            };
        }

        case OutcomeType.INVALID: {
            const [reasoning] = decodeAbiParameters(parseAbiParameters('string'), data);
            return { invalidReason: reasoning };
        }

        default:
            throw new Error(`Unknown outcome type: ${type}`);
    }
}
