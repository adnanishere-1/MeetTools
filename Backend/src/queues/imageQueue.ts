import { Queue } from 'bullmq';

const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379, // ✅ REDISS_PORT typo fix
  maxRetriesPerRequest: null, // BullMQ ke liye zaroori hai
  // Agar Redis password ho toh yahan uncomment karein:
  // password: process.env.REDIS_PASSWORD || undefined,
};

// Default Job Options (Attempts, Backoff & Cleanup)
const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 2000,
  },
  // Completed jobs 1 ghante tak Redis mein save rahengi (status API ke liye)
  removeOnComplete: {
    age: 3600,
    count: 100,
  },
  removeOnFail: false, // Failed jobs debug ke liye
};

// 1. General/Default Image Queue (Backward compatibility ke liye)
export const imageQueue = new Queue('meettools-image-queue', {
  connection: redisConnection,
  defaultJobOptions,
});

// 2. Queue for Image Metadata Cleanup & Optimization
export const cleanQueue = new Queue('meettools-clean-queue', {
  connection: redisConnection,
  defaultJobOptions,
});

// 3. Queue for Image Resizing & Format Conversion
export const resizeQueue = new Queue('meettools-resize-queue', {
  connection: redisConnection,
  defaultJobOptions,
});