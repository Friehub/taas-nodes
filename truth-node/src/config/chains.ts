import { defineChain } from 'viem';

export const heliosChain = defineChain({
    id: 42000,
    name: 'Helios Testnet',
    network: 'helios-testnet',
    nativeCurrency: {
        decimals: 18,
        name: 'Ether',
        symbol: 'ETH',
    },
    rpcUrls: {
        default: {
            http: ['https://testnet1.helioschainlabs.org'],
        },
        public: {
            http: ['https://testnet1.helioschainlabs.org'],
        },
    }
});
