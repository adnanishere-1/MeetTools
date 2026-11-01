
import Redis, { type RedisOptions } from "ioredis";

import { env } from "./env.js";
import { logger } from "../utils/logger.js";

// =====================================
// Redis Configuration Validation
// =====================================

const redisPort = Number(env.REDIS_PORT);

if (
  !Number.isInteger(redisPort) ||
  redisPort < 1 ||
  redisPort > 65535
) {
  throw new Error("Invalid REDIS_PORT configuration");
}

if (!env.REDIS_HOST?.trim()) {
  throw new Error("REDIS_HOST is required");
}

if (env.REDIS_TLS && !env.REDIS_PASSWORD) {
  throw new Error(
    "REDIS_PASSWORD is required when Redis TLS is enabled"
  );
}

// =====================================
// Redis Connection Options
// =====================================

export const redisConnectionOptions: RedisOptions = {
  host: env.REDIS_HOST.trim(),
  port: redisPort,

  ...(env.REDIS_USERNAME
    ? { username: env.REDIS_USERNAME }
    : {}),

  ...(env.REDIS_PASSWORD
    ? { password: env.REDIS_PASSWORD }
    : {}),

  ...(env.REDIS_TLS
    ? {
        tls: {
          rejectUnauthorized: true,
        },
      }
    : {}),

  // Required for BullMQ compatibility.
  maxRetriesPerRequest: null,

  // Do not accumulate commands in memory
  // while Redis is disconnected.
  enableOfflineQueue: false,

  // Do not automatically resend unfulfilled commands.
  autoResendUnfulfilledCommands: false,

  // Connection health checks.
  enableReadyCheck: true,
  connectTimeout: 10000,
  keepAlive: 30000,

  // Retry connection with capped delay.
  retryStrategy(times: number) {
    const delay = Math.min(times * 200, 3000);

    logger.warn(
      { attempt: times, delay },
      "Redis reconnect scheduled"
    );

    return delay;
  },
};

// =====================================
// Shared Redis Client
// =====================================

export const redis = new Redis(
  redisConnectionOptions
);

// =====================================
// Redis Event Handling
// =====================================

redis.on("connect", () => {
  logger.info("Connecting to Redis...");
});

redis.on("ready", () => {
  logger.info("Redis connection established.");
});

redis.on("error", (error) => {
  logger.error(
    {
      name: error.name,
      message: error.message,
    },
    "Redis connection error"
  );
});

redis.on("reconnecting", () => {
  logger.warn("Reconnecting to Redis...");
});

redis.on("close", () => {
  logger.warn("Redis connection closed.");
});

redis.on("end", () => {
  logger.error("Redis connection ended.");
});

// =====================================
// Redis Health Check
// =====================================

export const checkRedisConnection = async (): Promise<boolean> => {
  try {
    const result = await redis.ping();

    return result === "PONG";
  } catch (error) {
    logger.error(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unknown Redis error",
      },
      "Redis health check failed"
    );

    return false;
  }
};
