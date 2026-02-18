import express from 'express';
import cors from 'cors';
import { RecipeRegistry } from '@friehub/recipes';
import { startWorkerEngine } from './workers/truthWorker';
import { TruthRelayer } from './services/TruthRelayer';
import { ChallengerBot } from './services/ChallengerBot';
import { NodeHealthService } from './services/NodeHealthService';
import { initViem } from './config/viem';
import { RecipeExecutor } from '@friehub/execution-engine';
import { RecipeInstance } from '@friehub/recipes';
import { WorkerEngine } from './services/WorkerEngine';
import { logger } from './config/logger';
import { registry } from './config/metrics';
import fs from 'fs';
import path from 'path';

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 3001;

// Initialize Registry
import { bootstrapRegistry } from '@friehub/data-feeds';
import { config as envConfig } from './config/env';

// Register All Truth Data Feeds (including Generic API)
bootstrapRegistry({
    financeApiKey: envConfig.NEWS_API_KEY,
    youtubeApiKey: envConfig.YOUTUBE_API_KEY,
    sportMonksKey: envConfig.SPORTMONKS_KEY,
    openWeatherKey: envConfig.OPENWEATHER_API_KEY,
    fredApiKey: envConfig.FRED_API_KEY,
    alphaVantageKey: envConfig.ALPHAVANTAGE_KEY,
    theOddsApiKey: envConfig.THEODDS_API_KEY || envConfig.THEODDS_KEY, // Correctly mapped
    sportsDbKey: undefined, // No key available in env
    groqKey: envConfig.GROQ_API_KEY // Added Groq Support
} as any);

// --- API Routes ---

app.get('/templates', async (req: any, res: any) => {
    const templates = await RecipeRegistry.getInstance().listAsync();
    res.json(templates);
});

/**
 * @route GET /metrics
 * @desc Expose Prometheus metrics
 */
app.get('/metrics', async (req, res) => {
    try {
        res.set('Content-Type', registry.contentType);
        res.end(await registry.metrics());
    } catch (ex) {
        res.status(500).end(ex);
    }
});

/**
 * @route POST /api/templates/simulate
 * @desc Simulate a template with raw JSON content (dry-run)
 */
app.post('/api/templates/simulate', async (req: any, res: any) => {
    const { template, inputs } = req.body;

    if (!template) {
        return res.status(400).json({ success: false, error: 'template JSON is required' });
    }

    try {
        logger.info({ templateName: template.metadata?.name }, '[TruthNode] Simulating temporary template');
        if (!template) {
            return res.status(400).json({ error: 'Template is required' });
        }
        const recipe = new RecipeInstance(template).toRecipe();
        const result = await RecipeExecutor.execute(recipe as any, inputs || {});

        res.json({
            success: result.success,
            result
        });
    } catch (error: any) {
        logger.error({ err: error.message }, '[TruthNode] Simulation failed');
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- Dashboard API Endpoints ---
import axios from 'axios';

app.get('/api/admin/stats', async (req: any, res: any) => {
    try {
        const templates = await RecipeRegistry.getInstance().listAsync();
        const activeFeeds = templates.length;

        // Fetch real network stats from the Indexer (Source Registry)
        // Default to localhost:3002 if not specified
        const INDEXER_URL = process.env.INDEXER_API_URL || 'http://localhost:3002';

        let totalStaked = 0;
        let totalSources = 0;
        let totalRequests = 0;

        try {
            const indexerRes = await axios.get(`${INDEXER_URL}/stats`);
            if (indexerRes.data.success) {
                totalStaked = parseFloat(indexerRes.data.data.total_staked || '0');
                totalSources = parseInt(indexerRes.data.data.total_sources || '0');
                totalRequests = parseInt(indexerRes.data.data.total_requests || '0');
            }
        } catch (err) {
            logger.warn({ err: (err as Error).message }, '[TruthNode] Failed to fetch stats from Indexer');
        }

        // Return aggregated system metrics
        res.json({
            totalRequests: totalRequests, // Real metric from Indexer
            activeFeeds: activeFeeds, // Count of registered recipes
            totalStaked: totalStaked, // Real stake from Indexer
            activeSources: totalSources, // Real source count from Indexer
            avgLatency: 1.2
        });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/notifications', async (req: any, res: any) => {
    // In a real scenario, this would fetch from a database or Redis stream of recent executions
    // For now, we return a structural placeholder that matches the dashboard's expectation
    // This allows the dashboard to render the "Live Truth Stream" without errors
    res.json([
        {
            id: 'init-1',
            recipeName: 'System Initialization',
            recipeId: 'system-boot',
            timestamp: new Date().toISOString(),
            txHash: '0x0000000000000000000000000000000000000000',
            outcome: { type: 'BINARY', value: 1, confidence: 1 }
        }
    ]);
});

// Alias for dashboard compatibility
app.get('/api/markets/templates', async (req: any, res: any) => {
    const templates = await RecipeRegistry.getInstance().listAsync();
    res.json(templates);
});

app.post('/verify', async (req: any, res: any) => {
    // Manual trigger for testing/demo purposes
    // In production, this is triggered by TruthRelayer via on-chain events
    const { recipeId, inputs } = req.body;
    try {
        const recipeInstance = await RecipeRegistry.getInstance().get(recipeId);
        if (!recipeInstance) {
            return res.status(404).json({ error: 'Recipe not found' });
        }
        const result = await RecipeExecutor.execute(recipeInstance as any, inputs);

        res.json({
            status: result.success ? 'success' : 'failed',
            outcome: result.winningOutcome,
            proof: result.proof,
            recipeId
        });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.listen(PORT, async () => {
    // 1. Initialize Viem & KMS
    try {
        await initViem();
    } catch (err: any) {
        logger.error({ err: err.message }, '[TruthNode] Viem Initialization failed');
    }

    // 2. Load and Register Recipes from templates directory
    try {
        const templatesDir = path.join(__dirname, '../templates');
        if (fs.existsSync(templatesDir)) {
            const files = fs.readdirSync(templatesDir).filter(f => f.endsWith('.json'));
            for (const file of files) {
                const blueprint = JSON.parse(fs.readFileSync(path.join(templatesDir, file), 'utf8'));
                const recipe = new RecipeInstance(blueprint).toRecipe();
                await RecipeRegistry.register(recipe);
                logger.info({ id: recipe.id }, '[TruthNode] Template registered from disk');
            }
        }
    } catch (err: any) {
        logger.error({ err: err.message }, '[TruthNode] Failed to load templates from disk');
    }

    logger.info({ port: PORT, oracle: envConfig.ORACLE_ADDRESS }, '[TruthNode] Information Sentinel running');

    const mode = process.env.NODE_MODE?.toLowerCase() || 'sentinel';
    logger.info({ mode }, '[TruthNode] Starting TaaS Node');

    if (mode === 'sentinel' || mode === 'both') {
        const useRedis = process.env.ENABLE_REDIS === 'true';
        logger.info({ mode, useRedis }, '[TruthNode] Initializing Sentinel layer');

        // Start Worker Layer (handles both Lite and Redis modes)
        await WorkerEngine.start();

        // Start Proactive Relayer
        await TruthRelayer.start();
    }

    if (mode === 'challenger' || mode === 'both') {
        // Start Challenger Bot
        await ChallengerBot.start();
    }

    // 3. Start Node Health Service (Anti-Jail & Registration)
    await NodeHealthService.start();
});
