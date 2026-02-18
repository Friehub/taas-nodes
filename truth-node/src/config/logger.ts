import pino from 'pino';

/**
 * Logger Configuration
 * 
 * Supports pretty-printing in development and structured JSON in production.
 */
export const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV !== 'production'
        ? {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
            }
        }
        : undefined,
});

/**
 * Log child with metadata (e.g., requestId)
 */
export const createChildLogger = (metadata: Record<string, any>) => {
    return logger.child(metadata);
};
