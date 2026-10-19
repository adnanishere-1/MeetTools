import Redis from 'ioredis';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

// BullMQ ke liye maxRetriesPerRequest ko null rakhna zaroori hai
export const redis = new Redis({
  host: env.REDIS_HOST,
  port: Number(env.REDIS_PORT),
  maxRetriesPerRequest: null,
});

redis.on('connect', () => {
  logger.info('📦 Successfully connected to Redis');
});

redis.on('error', (error) => {
  logger.error(`❌ Redis connection error: ${error.message}`);
});

redis.on('close', () => {
  logger.warn('⚠️ Redis connection closed');
});