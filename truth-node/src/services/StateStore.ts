import Redis from 'ioredis';
import { redisConfig } from '../config/redis';

/**
 * StateStore
 * 
 * Manages persistent shared state for the Sentinel node using Redis.
 * Used for block tracking, rate limiting, and coordinator synchronization.
 */
export class StateStore {
    private static redis: Redis;

    private static getClient(): Redis {
        if (!this.redis) {
            this.redis = new Redis(redisConfig);
        }
        return this.redis;
    }

    /**
     * Get the last processed block for a given chain
     */
    static async getLastProcessedBlock(chainId: number): Promise<number | null> {
        const val = await this.getClient().get(`sentinel:block:${chainId}`);
        return val ? parseInt(val, 10) : null;
    }

    /**
     * Update the last processed block
     */
    static async setLastProcessedBlock(chainId: number, blockNumber: number): Promise<void> {
        await this.getClient().set(`sentinel:block:${chainId}`, blockNumber.toString());
    }

    /**
     * Safely update the last processed block (only if higher)
     */
    /**
     * Set a value only if it doesn't exist (Atomic lock)
     * @returns true if set, false if already exists
     */
    static async setNX(key: string, value: string, ttlSeconds: number): Promise<boolean> {
        const result = await this.getClient().set(key, value, 'EX', ttlSeconds, 'NX');
        return result === 'OK';
    }

    /**
     * Safely update the last processed block (only if higher)
     */
    static async updateLastProcessedBlock(chainId: number, blockNumber: number): Promise<void> {
        const current = await this.getLastProcessedBlock(chainId);
        if (!current || blockNumber > current) {
            await this.setLastProcessedBlock(chainId, blockNumber);
        }
    }
}
