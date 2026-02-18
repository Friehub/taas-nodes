import { Queue, Job } from 'bullmq';
import { redisConfig } from '../config/redis';

export const TRUTH_QUEUE_NAME = 'truth-verification-queue';

export const truthQueue = new Queue(TRUTH_QUEUE_NAME, {
    connection: redisConfig,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 5000,
        },
        removeOnComplete: true,
        removeOnFail: false,
    }
});

export interface TruthJobData {
    requestId: string;
    recipeId: string;
    inputs: Record<string, any>;
    chainId: number;
    legacy: boolean;
}

export const addVerificationToQueue = async (data: TruthJobData) => {
    console.log(`[Queue] Enqueueing verification for ${data.requestId} (Template: ${data.recipeId})`);
    return await truthQueue.add(`verify-${data.requestId}`, data, {
        priority: data.legacy ? 10 : 5 // Legacy/Prediction markets might have higher priority?
    });
};
