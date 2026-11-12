import { Queue, type ConnectionOptions } from "bullmq";

import type {
  ImageEnhancerQueuePayload,
} from "../models/image-enhancer/imageEnhancer.types";

import {
  redisConnectionOptions,
} from "../config/redis.js";

export const IMAGE_ENHANCER_QUEUE_NAME = "image-enhancer";

export const imageEnhancerQueue =
  new Queue<ImageEnhancerQueuePayload>(
    IMAGE_ENHANCER_QUEUE_NAME,
    {
      connection: redisConnectionOptions as ConnectionOptions,

      defaultJobOptions: {
        attempts: 3,

        backoff: {
          type: "exponential",
          delay: 2000,
        },

        removeOnComplete: {
          age: 24 * 60 * 60,
          count: 1000,
        },

        removeOnFail: {
          age: 7 * 24 * 60 * 60,
          count: 5000,
        },
      },
    },
  );

export async function closeImageEnhancerQueue(): Promise<void> {
  await imageEnhancerQueue.close();
}