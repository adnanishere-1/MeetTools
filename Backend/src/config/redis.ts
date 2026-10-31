
import Redis, { type RedisOptions } from "ioredis";

import { env } from "./env.js";
import { logger } from "../utils/logger.js";

// =====================================
// Redis Configuration
// =====================================

const redisPort = Number(env.REDIS_PORT);

if (
  !Number.isInteger(redisPort) ||
  redisPort < 1 ||
  redisPort > 65535
) {
  throw new Error("Invalid REDIS_PORT configuration");
}

export const redisConnectionOptions: RedisOptions = {
  host: env.REDIS_HOST,
  port: redisPort,

  ...(env.REDIS_USERNAME
    ? { username: env.REDIS_USERNAME }
    : {}),

  ...(env.REDIS_PASSWORD
    ? { password: env.REDIS_PASSWORD }
    : {}),

  ...(env.REDIS_TLS
    ? { tls: {} }
    : {}),

  maxRetriesPerRequest: null,

  retryStrategy(times) {
    return Math.min(times * 200, 3000);
  },

  connectTimeout: 10000,
  keepAlive: 30000,
  autoResendUnfulfilledCommands: false,
};

// =====================================
// Shared Redis Client
// =====================================

export const redis = new Redis(
  redisConnectionOptions
);

redis.on("connect", () => {
  logger.info("🔌 Connecting to Redis...");
});

redis.on("ready", () => {
  logger.info("✅ Redis connection established.");
});

redis.on("error", (error) => {
  logger.error(
    { err: error },
    "❌ Redis connection error"
  );
});

redis.on("reconnecting", () => {
  logger.warn("♻️ Reconnecting to Redis...");
});
