import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

/**
 * Metrics Registry
 */
export const registry = new Registry();

// Add default system metrics (CPU, RAM, etc.)
collectDefaultMetrics({ register: registry, prefix: 'taas_sentinel_' });

/**
 * Truth Node Metrics
 */

// 1. Job Throughput
export const truthRequestsTotal = new Counter({
    name: 'taas_truth_requests_total',
    help: 'Total number of truth requests received',
    labelNames: ['chainId', 'legacy'] as const,
    registers: [registry]
});

export const resolutionStatus = new Counter({
    name: 'taas_resolution_status_total',
    help: 'Status of resolutions (completed, failed, challenged)',
    labelNames: ['status', 'chainId'] as const,
    registers: [registry]
});

// 2. Performance
export const resolutionDuration = new Histogram({
    name: 'taas_resolution_duration_seconds',
    help: 'Time taken to resolve a truth request',
    labelNames: ['chainId'] as const,
    buckets: [1, 5, 10, 30, 60, 120, 300],
    registers: [registry]
});

// 3. Infrastructure
export const walletBalance = new Gauge({
    name: 'taas_wallet_balance_eth',
    help: 'Current ETH balance of the sentinel wallet',
    labelNames: ['chainId', 'address'] as const,
    registers: [registry]
});

export const gasPrice = new Gauge({
    name: 'taas_gas_price_gwei',
    help: 'Current gas price for the chain',
    labelNames: ['chainId'] as const,
    registers: [registry]
});
