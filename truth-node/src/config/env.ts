import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// 1. Load Environment Variables from root .env if possible, otherwise local
dotenv.config({ path: path.resolve(__dirname, '../../../../../.env') });
dotenv.config(); // Fallback to local .env

// 2. Define the Schema
const envSchema = z.object({
    // Server
    PORT: z.string().default('3001').transform(Number),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

    // Blockchain (Helios/Polygon)
    RPC_URL: z.string().url(),
    PRIVATE_KEY: z.string().regex(/^0x[a-fA-F0-9]{64}$/, "Invalid Private Key format"),
    ORACLE_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Oracle Address format"),
    TOKEN_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Token Address format"),
    NODE_REGISTRY_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Node Registry Address format").default('0x4189C7f984B0a62e333bD0cF508e43881Bd59744'),
    INDEXER_API_URL: z.string().url().default('http://localhost:3002'),

    // Infrastructure
    REDIS_HOST: z.string().default('localhost'),
    REDIS_PORT: z.string().default('6379').transform(Number),
    REDIS_PASSWORD: z.string().optional(),

    // AI Keys
    GEMINI_API_KEY: z.string().optional(),
    OPENAI_API_KEY: z.string().optional(),
    ANTHROPIC_API_KEY: z.string().optional(),
    GROQ_API_KEY: z.string().optional(),

    // Data Sources
    COINGECKO_API_KEY: z.string().optional(),
    THEODDS_API_KEY: z.string().optional(),
    THEODDS_KEY: z.string().optional(), // Alias for .env compatibility
    SERPER_API_KEY: z.string().optional(),
    SERPAPI_KEY: z.string().optional(),
    NEWS_API_KEY: z.string().optional(),

    // Additional Data Sources (Synced from .env)
    YOUTUBE_API_KEY: z.string().optional(),
    COINGECKO_KEY: z.string().optional(),     // Matches .env
    ALPHAVANTAGE_KEY: z.string().optional(),  // Matches .env
    FRED_API_KEY: z.string().optional(),
    SPORTMONKS_KEY: z.string().optional(),
    OPENWEATHER_API_KEY: z.string().optional(),

    // Node Config
    REGISTRATION_TOKEN: z.string().optional(),
    NODE_ID: z.string().optional(),
    CHAIN_ID: z.string().default('42000').transform(Number),
    MINIMUM_BOND: z.string().optional().transform(v => v ? BigInt(v) : 0n),
});

// 3. Validate and Export
const processEnv = process.env;

const parsed = envSchema.safeParse(processEnv);

if (!parsed.success) {
    console.error(' Invalid Environment Variables:');
    console.error(JSON.stringify(parsed.error.format(), null, 2));
    process.exit(1);
}

export const config = parsed.data;

/**
 * Global utility to check if we are in production
 */
export const isProd = config.NODE_ENV === 'production';
