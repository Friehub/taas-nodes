/**
 * Sentinel Lite - Memory Queue Engine
 * A lightweight alternative to BullMQ/Redis for ARM/Browser/Mobile environments
 */

import { EventEmitter } from 'events';
import { logger } from '../config/logger';

export interface LiteJob<T = any> {
    id: string;
    data: T;
}

export class MemoryQueueEngine extends EventEmitter {
    private static instance: MemoryQueueEngine;
    private queue: LiteJob[] = [];
    private processing = false;

    private constructor() {
        super();
    }

    public static getInstance() {
        if (!MemoryQueueEngine.instance) {
            MemoryQueueEngine.instance = new MemoryQueueEngine();
        }
        return MemoryQueueEngine.instance;
    }

    public async add(name: string, data: any) {
        const id = Math.random().toString(36).substring(7);
        const job = { id, data };
        this.queue.push(job);
        logger.info({ id, name }, '[LiteQueue] Job added to memory');

        if (!this.processing) {
            this.process();
        }
        return job;
    }

    private async process() {
        if (this.queue.length === 0) {
            this.processing = false;
            return;
        }

        this.processing = true;
        const job = this.queue.shift();

        if (job) {
            try {
                logger.info({ id: job.id }, '[LiteQueue] Processing job');
                this.emit('process', job);
            } catch (err: any) {
                logger.error({ id: job.id, err: err.message }, '[LiteQueue] Process failed');
            }
        }

        // Slight delay to mimic async behavior and prevent stack overflow
        setTimeout(() => this.process(), 10);
    }
}
