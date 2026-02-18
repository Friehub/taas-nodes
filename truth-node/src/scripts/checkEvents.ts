import { createPublicClient, http, parseAbiItem } from 'viem';
import { mainnet } from 'viem/chains';

const helios = {
    id: 42000,
    name: 'Helios',
    network: 'helios',
    nativeCurrency: { name: 'Helios', symbol: 'HLS', decimals: 18 },
    rpcUrls: {
        default: { http: ['https://testnet1.helioschainlabs.org'] },
        public: { http: ['https://testnet1.helioschainlabs.org'] },
    },
};

async function check() {
    const client = createPublicClient({
        chain: helios as any,
        transport: http(),
    });

    const address = '0xF25ab4c58A4B781E2De56dA8329888EB952f48C3';
    console.log(`Checking events for ${address}...`);

    const logs = await client.getLogs({
        address: address as `0x${string}`,
        event: parseAbiItem('event RecipeRequested(bytes32 indexed requestId, bytes recipeData)'),
        fromBlock: 1200900n,
        toBlock: 1201300n,
    });

    console.log(`Found ${logs.length} events:`);
    logs.forEach(log => {
        console.log(`Block: ${log.blockNumber}, Tx: ${log.transactionHash}`);
        console.log(`Args: ${JSON.stringify(log.args)}`);
    });

    process.exit(0);
}

check().catch(err => {
    console.error(err);
    process.exit(1);
});
