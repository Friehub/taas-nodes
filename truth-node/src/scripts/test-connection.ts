
import dotenv from 'dotenv';
dotenv.config();

// Force Proxy Mode for this test
process.env.TAAS_USE_PROXY = 'true';
process.env.TAAS_PROXY_URL = process.env.INDEXER_API_URL || 'http://localhost:3002';

import { bootstrapRegistry, globalRegistry } from '@friehub/sovereign-logic';
import { DataCategory } from '@friehub/sovereign-logic';

async function main() {
    console.log('🧪 Starting Connectivity Test (Blinded Proxy Mode)...');
    console.log(`📡 Gateway URL: ${process.env.TAAS_PROXY_URL}`);

    // 1. Bootstrap Registry (This will use ProxyDataSource because of env vars)
    await bootstrapRegistry({
        useProxy: true,
        proxyUrl: process.env.TAAS_PROXY_URL
    });

    // 2. Verify Source Type
    const coingecko = globalRegistry.get('coingecko');
    if (!coingecko) {
        console.error('❌ CoinGecko source not registered!');
        process.exit(1);
    }
    console.log(`✅ Source Registered: ${coingecko.id}`);

    // Check if it's a proxy
    if ((coingecko as any).proxyUrl) {
        console.log(`✅ Source is correctly proxied to: ${(coingecko as any).proxyUrl}`);
    } else {
        console.warn('⚠️  Source does NOT look like a proxy. Check bootstrap logic.');
    }

    // 3. Attempt Fetch
    console.log('🔄 Fetching Bitcoin Price via Gateway...');
    const startTime = Date.now();
    try {
        const result = await coingecko.fetch({
            params: { symbol: 'BTC' }
        });

        const duration = Date.now() - startTime;
        console.log(`\n🎉 SUCCESS! Received Data in ${duration}ms:`);
        console.log(JSON.stringify(result.data, null, 2));

        if (result.metadata.source === 'coingecko') {
            console.log('✅ Metadata confirms source origin.');
        }

    } catch (error: any) {
        console.error('\n❌ FETCH FAILED');
        console.error('Error:', error.message);
        console.error('Hint: Is the Gateway running on localhost:3002?');
        process.exit(1);
    }
}

main().catch(console.error);
