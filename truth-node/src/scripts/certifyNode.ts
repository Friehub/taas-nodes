import { getPublicClient, getWalletClient, getAccount, initViem } from '../config/viem';
import { type Hex, type Address, parseAbi } from 'viem';
import { config } from '../config/env';
import { heliosChain } from '../config/chains';

const ORACLE_ADDRESS = config.ORACLE_ADDRESS as Hex;
const partialAbi = parseAbi([
    'function owner() view returns (address)',
    'function certifiedNodes(address) view returns (bool)',
    'function setCertifiedNode(address, bool)'
]);

async function main() {
    await initViem();
    const account = getAccount();

    console.log('--- TaaS Node Certification Utility (Packages) ---');
    console.log(`Oracle Address: ${ORACLE_ADDRESS}`);
    console.log(`Node Address: ${account.address}`);

    const publicClient = getPublicClient();

    try {
        // 1. Check if already certified
        const isCertified = await publicClient.readContract({
            address: ORACLE_ADDRESS,
            abi: partialAbi,
            functionName: 'certifiedNodes',
            args: [account.address]
        });

        if (isCertified) {
            console.log('Node is already certified.');
            return;
        }

        // 2. Check Owner
        const owner = await publicClient.readContract({
            address: ORACLE_ADDRESS,
            abi: partialAbi,
            functionName: 'owner'
        }) as Address;

        console.log(`Contract Owner: ${owner}`);

        if (owner.toLowerCase() !== account.address.toLowerCase()) {
            console.error('Error: This private key is NOT the contract owner. Only the owner can certify nodes.');
            return;
        }

        // 3. Certify Node
        console.log('Sending certification transaction...');
        const walletClient = getWalletClient();
        const hash = await walletClient.writeContract({
            address: ORACLE_ADDRESS,
            abi: partialAbi,
            functionName: 'setCertifiedNode',
            args: [account.address, true],
            chain: heliosChain,
            account
        } as any);

        console.log(`Transaction Sent! Hash: ${hash}`);
        console.log('Waiting for confirmation...');

        await publicClient.waitForTransactionReceipt({ hash });
        console.log('Node successfully certified!');

    } catch (error: any) {
        console.error('Certification failed:', error.message);
    }
}

main();
