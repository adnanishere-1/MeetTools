import { Queue } from 'bullmq';

const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDISS_PORT || process.env.REDIS_PORT) || 6379,
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
  // 💥 FIX: true ki jagah age aur count rakha hai taaki status API check kar sake
  removeOnComplete: {
    age: 3600, // Completed jobs 1 ghante (3600 seconds) tak Redis mein save rahengi
    count: 100, // Maximum pichli 100 completed jobs store rahengi
  },
  removeOnFail: false, // Failed jobs ko debug ke liye store rakhein
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