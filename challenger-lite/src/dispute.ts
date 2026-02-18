import { createWalletClient, http, publicActions, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { heliosChain as helios } from './config/chains';
import TruthOracleABI from './abis/TruthOracleV2.json';
import dotenv from 'dotenv';

import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../../../.env') });
dotenv.config();

const PRIVATE_KEY = process.env.CHALLENGER_PRIVATE_KEY as `0x${string}`;
const ORACLE_ADDRESS = process.env.ORACLE_ADDRESS as `0x${string}`;
const RPC_URL = process.env.RPC_URL || 'https://rpc.helios.friehub.com';

if (!PRIVATE_KEY) {
    console.warn('[Challenger] CHALLENGER_PRIVATE_KEY not set. Dispute submission will fail.');
}

const account = PRIVATE_KEY ? privateKeyToAccount(PRIVATE_KEY) : undefined;

const client = createWalletClient({
    account,
    chain: helios,
    transport: http(RPC_URL)
}).extend(publicActions);

export async function submitDispute(queryId: string, correctOutcome: any) {
    if (!account) {
        console.error('[Challenger] Cannot submit dispute: No Private Key configured.');
        return;
    }

    console.log(`[Challenger] Submitting Dispute for Query: ${queryId}`);
    try {
        // Convert outcome to uint256 if needed (assuming numeric outcomes for now)
        // For rich outcomes (strings), we might need encoding
        const outcomeBigInt = BigInt(correctOutcome);

        // @ts-ignore
        const hash = await client.writeContract({
            address: ORACLE_ADDRESS,
            abi: TruthOracleABI.abi,
            functionName: 'disputeTruth',
            args: [queryId],
            value: parseEther('10') // Message.value if stake is required (e.g. 10 TAAS)
        });

    });

    console.log(`[Challenger] Dispute Transaction Sent: ${hash}`);

    // Wait for confirmation
    const receipt = await client.waitForTransactionReceipt({ hash });
    console.log(`[Challenger] Transaction Confirmed in Block: ${receipt.blockNumber}`);

} catch (err: any) {
    console.error(`[Challenger] Dispute Transaction Failed:`, err.message);
}
}
