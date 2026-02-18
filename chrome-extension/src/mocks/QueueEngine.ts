export class MemoryQueueEngine {
    constructor() { }

    async getJobCounts() {
        return { waiting: 0, active: 0, completed: 0, failed: 0 };
    }

    async processJobs(handler: (job: any) => Promise<any>) {
        // Mock processing loop
        return;
    }

    async add(job: any) {
        return;
    }
}
