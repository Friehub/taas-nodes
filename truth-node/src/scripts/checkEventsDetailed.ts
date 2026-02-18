import { createPublicClient, http } from 'viem';

const helios = {
    id: 42000,
    name: 'Helios',
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
    console.log(`Checking ALL logs for ${address} around block 1201258...`);

    const logs = await client.getLogs({
        address: address as `0x${string}`,
        fromBlock: 1201250n,
        toBlock: 1201270n,
    });

    console.log(`Found ${logs.length} events:`);
    logs.forEach(log => {
        console.log(`Block: ${log.blockNumber}, Tx: ${log.transactionHash}`);
        console.log(`Topics: ${JSON.stringify(log.topics)}`);
        console.log(`Data: ${log.data}`);
    });

    process.exit(0);
}

check().catch(err => {
    console.error(err);
    process.exit(1);
});
