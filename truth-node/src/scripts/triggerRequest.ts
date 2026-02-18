import { getPublicClient, getWalletClient, getAccount, initViem } from '../config/viem';
import { type Hex, encodeAbiParameters, parseAbiParameters, keccak256, toHex, parseAbi } from 'viem';
import { config } from '../config/env';
import { heliosChain } from '../config/chains';

const ORACLE_ADDRESS = config.ORACLE_ADDRESS as Hex;
const partialAbi = parseAbi([
    'function requestTruth(bytes32, bytes) payable'
]);

async function main() {
    await initViem();
    const account = getAccount();

    console.log('--- TaaS Truth Request Trigger ---');

    const publicClient = getPublicClient();
    const walletClient = getWalletClient();

    const requestId = keccak256(toHex(Math.random().toString()));
    const recipeId = 'btc-price-daily';
    const inputs = JSON.stringify({ target: 50000, date: '2026-02-11' });

    const extraData = encodeAbiParameters(
        parseAbiParameters('string, string'),
        [recipeId, inputs]
    );

    console.log(`Request ID: ${requestId}`);
    console.log(`Template: ${recipeId}`);
    console.log(`Inputs: ${inputs}`);

    try {
        console.log('Sending TruthRequest to Helios testnet...');
        const hash = await walletClient.writeContract({
            address: ORACLE_ADDRESS,
            abi: partialAbi,
            functionName: 'requestTruth',
            args: [requestId, extraData],
            chain: heliosChain,
            account
        } as any);

        console.log(`Transaction Sent! Hash: ${hash}`);
        console.log('Waiting for confirmation...');

        await publicClient.waitForTransactionReceipt({ hash });
        console.log('Truth Request successfully triggered!');

    } catch (error: any) {
        console.error('Failed to trigger request:', error.message);
    }
}

main();
