import { createPublicClient, http, type Hex, parseAbi } from 'viem';
import { heliosChain } from '../config/chains';
import { config as taasConfig } from '../config/env';

// Addresses from both environments
const addresses = {
    "TaaS TruthNode Oracle": taasConfig.ORACLE_ADDRESS as Hex,
    "PM Factory": "0x0b1928c9Ce08ac1e8F2C022Cb1df18A460149BF9" as Hex,
    "PM Oracle": "0x6942881Bbf662549cBA6AeC14b885fA27d0eBBd6" as Hex,
    "Chronos Hub": "0x04C13044b8483029034160b9C3a4cFbF7624e91C" as Hex,
    "Auto Resolver": "0x10a55Ced0f9E7a8a507fcd1C5a146B28cF05311E" as Hex,
    "Position Registry": "0x33D972d674B86aE346Bc607eDEfB1eD8852F3abf" as Hex
};

const oracleAbi = parseAbi([
    'function zkVerifier() view returns (address)',
    'function minimumBond() view returns (uint256)',
    'function owner() view returns (address)'
]);

async function main() {
    console.log('--- Helios Contract Audit ---');
    const client = createPublicClient({
        chain: heliosChain,
        transport: http()
    });

    for (const [name, address] of Object.entries(addresses)) {
        const code = await client.getBytecode({ address });
        if (!code || code === '0x') {
            console.error(`${name} (${address}): NOT DEPLOYED (EOA or Null)`);
        } else {
            console.log(`${name} (${address}): Deployed (${code.length / 2} bytes)`);

            // If it's an Oracle, check its config
            if (name.includes('Oracle')) {
                try {
                    const zkVerifier = await client.readContract({
                        address,
                        abi: oracleAbi,
                        functionName: 'zkVerifier'
                    });
                    const bond = await client.readContract({
                        address,
                        abi: oracleAbi,
                        functionName: 'minimumBond'
                    });
                    const owner = await client.readContract({
                        address,
                        abi: oracleAbi,
                        functionName: 'owner'
                    });
                    console.log(`   -> ZK Verifier: ${zkVerifier}`);
                    console.log(`   -> Minimum Bond: ${bond.toString()}`);
                    console.log(`   -> Owner: ${owner}`);
                } catch (e) {
                    console.log(`   -> Could not read Oracle state (Might be a different contract type)`);
                }
            }
        }
    }
}

main();
