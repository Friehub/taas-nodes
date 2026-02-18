import { type Hex } from 'viem';
import { getWalletClient, getAccount } from '../config/viem';
import { config } from '../config/env';

/**
 * EIP-712 domain for TaaS Truth Oracle V2
 */
const getDomain = () => ({
    name: 'TaaS Truth Oracle',
    version: '2',
    chainId: 42000, // Helios testnet
    verifyingContract: (config.ORACLE_ADDRESS as Hex) || '0x0000000000000000000000000000000000000000'
});

/**
 * EIP-712 types for outcome attestation
 */
const types = {
    Outcome: [
        { name: 'requestId', type: 'bytes32' },
        { name: 'outcomeType', type: 'uint8' },
        { name: 'outcomeData', type: 'bytes' },
        { name: 'timestamp', type: 'uint256' }
    ]
};

/**
 * Generate EIP-712 signature for outcome attestation
 * 
 * This signature proves that a specific sentinel node
 * verified the outcome at a specific timestamp.
 * 
 * @param data Outcome data to sign
 * @returns EIP-712 signature (Hex)
 */
export async function signOutcomeAttestation(data: {
    requestId: Hex;
    outcomeType: number;
    outcomeData: Hex;
    timestamp: bigint;
}): Promise<Hex> {
    const walletClient = getWalletClient();
    const account = getAccount();

    const signature = await walletClient.signTypedData({
        account,
        domain: getDomain(),
        types,
        primaryType: 'Outcome',
        message: data as any
    });

    return signature;
}

/**
 * Verify EIP-712 signature (for challenger nodes)
 * 
 * @param signature Signature to verify
 * @param data Original data that was signed
 * @param signer Expected signer address
 * @returns True if signature is valid
 */
export async function verifyOutcomeAttestation(
    signature: Hex,
    data: {
        requestId: Hex;
        outcomeType: number;
        outcomeData: Hex;
        timestamp: bigint;
    },
    signer: Hex
): Promise<boolean> {
    const { verifyTypedData } = require('viem');

    const valid = await verifyTypedData({
        address: signer,
        domain: getDomain(),
        types,
        primaryType: 'Outcome',
        message: data as any,
        signature
    });

    return valid;
}
