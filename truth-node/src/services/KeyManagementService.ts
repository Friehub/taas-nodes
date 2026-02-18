import { Hex, type Account } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { config } from '../config/env';
import { logger } from '../config/logger';

/**
 * IKeyProvider
 * 
 * Interface for pluggable key management backends.
 */
export interface IKeyProvider {
    getAccount(): Promise<Account>;
}

/**
 * LocalKeyProvider
 * 
 * Traditional provider loading keys from process.env.
 */
export class LocalKeyProvider implements IKeyProvider {
    async getAccount(): Promise<Account> {
        if (!config.PRIVATE_KEY) {
            throw new Error('PRIVATE_KEY not found in environment');
        }
        return privateKeyToAccount(config.PRIVATE_KEY as Hex);
    }
}

/**
 * KMSKeyProvider (Scaffold)
 * 
 * Placeholder for AWS KMS, Google Cloud KMS, or HashiCorp Vault.
 * In a real production setup, this would use the respective SDK to fetch/sign.
 */
export class KMSKeyProvider implements IKeyProvider {
    async getAccount(): Promise<Account> {
        // Architecture:
        // 1. Authenticate with Cloud Provider (IAM Role)
        // 2. Fetch encrypted key OR init a remote signer
        // 3. Return a Viem-compatible Custom Account
        logger.warn('[KMS] KMSKeyProvider is currently a scaffold. Falling back to local...');
        return new LocalKeyProvider().getAccount();
    }
}

/**
 * KeyManagementService
 * 
 * Coordinates key loading across configured providers.
 */
export class KeyManagementService {
    private static provider: IKeyProvider;

    static setProvider(provider: IKeyProvider) {
        this.provider = provider;
    }

    static async getAccount(): Promise<Account> {
        if (!this.provider) {
            // Default to Local for now, but in strict production modes we'd fail here
            this.provider = new LocalKeyProvider();
        }
        return await this.provider.getAccount();
    }
}
