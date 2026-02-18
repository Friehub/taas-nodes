import { startWorkerEngine } from '../workers/truthWorker';
import { MemoryQueueEngine } from './MemoryQueueEngine';
import { redisConfig } from '../config/redis';
import { logger } from '../config/logger';

export class WorkerEngine {
    private static worker: any;
    private static memoryQueue: MemoryQueueEngine;

    /**
     * Start the Truth Node Worker Layer
     */
    static async start() {
        // Sentinel Lite mode check
        const useRedis = process.env.ENABLE_REDIS === 'true';

        if (useRedis) {
            logger.info('[WorkerEngine] Starting background worker layer (Redis/BullMQ)...');
            try {
                this.worker = await startWorkerEngine();
                logger.info('[WorkerEngine] All BullMQ workers active.');
            } catch (err: any) {
                logger.error({ err: err.message }, '[WorkerEngine] Failed to start BullMQ workers');
                throw err;
            }
        } else {
            logger.info('[WorkerEngine] Starting background worker in Lite Mode (In-Memory Queue)');
            this.memoryQueue = MemoryQueueEngine.getInstance();

            // In lite mode, we trigger the truth worker logic directly via events
            // This bypasses the need for a Redis instance
            this.memoryQueue.on('process', async (job) => {
                logger.info({ jobId: job.id, requestId: job.data.requestId }, '[WorkerEngine] Processing job in Lite Mode');
                try {
                    const { processVerification } = await import('../workers/truthWorker');
                    await processVerification(job.data, job.id);
                    logger.info({ jobId: job.id }, '[WorkerEngine] Lite job processed successfully');
                } catch (err: any) {
                    logger.error({ jobId: job.id, err: err.message }, '[WorkerEngine] Lite job processing failed');
                }
            });
        }
    }

    static async stop() {
        if (this.worker) {
            await this.worker.close();
        }
    }
}
