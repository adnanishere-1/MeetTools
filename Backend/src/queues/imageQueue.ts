
import "dotenv/config";

import { Queue } from "bullmq";
import IORedis from "ioredis";

import { redisConnectionOptions } from "../config/redis.js";

// =====================================
// Redis Connection
// =====================================

const redisConnection = new IORedis(redisConnectionOptions);

// =====================================
// Default Job Options
// =====================================

const defaultJobOptions = {
  attempts: 3,

  backoff: {
    type: "exponential" as const,
    delay: 2000,
  },

  removeOnComplete: {
    age: 24 * 3600,
    count: 1000,
  },

  removeOnFail: {
    age: 7 * 24 * 3600,
  },
};

// =====================================
// Image Queue
// =====================================

export const imageQueue = new Queue(
  "meetools-image-queue",
  {
    connection: redisConnection,
    defaultJobOptions,
  }
);

// =====================================
// Clean Queue
// =====================================

export const cleanQueue = new Queue(
  "meetools-clean-queue",
  {
    connection: redisConnection,
    defaultJobOptions,
  }
);

// =====================================
// Resize Queue
// =====================================

export const resizeQueue = new Queue(
  "meetools-resize-queue",
  {
    connection: redisConnection,
    defaultJobOptions,
  }
);
