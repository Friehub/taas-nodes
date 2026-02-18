import Redis from 'ioredis';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const redisConfig = {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
};

async function reset() {
    const redis = new Redis(redisConfig);
    const key = 'sentinel:block:42000';
    const targetBlock = '1200900';

    console.log(`Setting ${key} to ${targetBlock}...`);
    await redis.set(key, targetBlock);

    const newVal = await redis.get(key);
    console.log(`New value: ${newVal}`);

    process.exit(0);
}

reset().catch(err => {
    console.error(err);
    process.exit(1);
});
