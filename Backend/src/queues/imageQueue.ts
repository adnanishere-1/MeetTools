import { Queue } from 'bullmq';

const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
};

// 1. General/Default Image Queue (Backward compatibility ke liye)
export const imageQueue = new Queue('meettools-image-queue', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: true,
  },
});

// 2. Queue for Image Metadata Cleanup & Optimization
export const cleanQueue = new Queue('meettools-clean-queue', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: true,
  },
});

// 3. Queue for Image Resizing & Format Conversion
export const resizeQueue = new Queue('meettools-resize-queue', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: true,
  },
});