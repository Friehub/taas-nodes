import { createPublicClient, createWalletClient, http, type Hex, type Account, type PublicClient, type WalletClient } from 'viem';
import { heliosChain } from './chains';
import * as chains from 'viem/chains';
import { KeyManagementService } from '../services/KeyManagementService';

let account: Account;

export const setAccount = (acc: Account) => {
    account = acc;
};

export const getAccount = (): Account => {
    if (!account) throw new Error('Account not initialized. Call initViem() first.');
    return account;
};

const clientCache: Record<number, { public: PublicClient, wallet: WalletClient }> = {};

export const getChain = (chainId?: number): any => {
    if (!chainId || chainId === heliosChain.id) return heliosChain;

    // Search in viem/chains
    const chain = Object.values(chains).find(c => (c as any).id === chainId);
    return chain || heliosChain;
};

export const getPublicClient = (chainId?: number): PublicClient => {
    const chain = getChain(chainId);
    if (!clientCache[chain.id]) {
        initClients(chain);
    }
    return clientCache[chain.id].public;
};

export const getWalletClient = (chainId?: number): WalletClient => {
    const chain = getChain(chainId);
    if (!clientCache[chain.id]) {
        initClients(chain);
    }
    return clientCache[chain.id].wallet;
};

function initClients(chain: any) {
    const publicClient = createPublicClient({
        chain,
        transport: http()
    });

    const walletClient = createWalletClient({
        chain,
        transport: http(),
        account: getAccount()
    });

    clientCache[chain.id] = { public: publicClient as any, wallet: walletClient as any };
}

// Default clients getters
export const getHeliosPublicClient = () => getPublicClient(heliosChain.id);
export const getHeliosWalletClient = () => getWalletClient(heliosChain.id);

/**
 * Initialize KMS and Clients
 */
export async function initViem() {
    const acc = await KeyManagementService.getAccount();
    setAccount(acc);
    initClients(heliosChain);
}
