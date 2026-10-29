
import Redis from "ioredis";

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
  throw new Error(
    "Invalid REDIS_PORT configuration"
  );
}

// =====================================
// Shared Redis Connection
// =====================================

export const redis = new Redis({
  host: env.REDIS_HOST,
  port: redisPort,

  // Required for BullMQ workers.
  maxRetriesPerRequest: null,

  // Reconnect automatically.
  retryStrategy(times) {
    return Math.min(times * 200, 3000);
  },

  // Prevent connection from hanging forever.
  connectTimeout: 10000,

  // Keep TCP connection alive.
  keepAlive: 30000,

  // Avoid automatically resending
  // unfulfilled commands after reconnect.
  autoResendUnfulfilledCommands: false,
});

// =====================================
// Redis Events
// =====================================

// TCP connection established.
redis.on("connect", () => {
  logger.info(
    "🔌 MeetTools Redis connection established"
  );
});

// Redis is ready to accept commands.
redis.on("ready", () => {
  logger.info(
    "📦 Successfully connected to Redis"
  );
});

// Redis connection errors.
redis.on("error", (error: Error) => {
  logger.error(
    { err: error },
    "❌ Redis connection error"
  );
});

// Redis connection closed.
redis.on("close", () => {
  logger.warn(
    "⚠️ Redis connection closed"
  );
});

// Redis reconnect attempts.
redis.on("reconnecting", (delay: number) => {
  logger.warn(
    { delayMs: delay },
    "🔄 Reconnecting to Redis..."
  );
});

// Redis connection ended permanently.
redis.on("end", () => {
  logger.warn(
    "🛑 Redis connection ended"
  );
});

// =====================================
// Graceful Shutdown
// =====================================

export const disconnectRedis =
  async (): Promise<void> => {
    try {
      if (redis.status === "end") {
        return;
      }

      if (
        redis.status === "ready" ||
        redis.status === "connect"
      ) {
        await redis.quit();
      } else {
        redis.disconnect();
      }

      logger.info(
        "✅ Redis disconnected successfully"
      );
    } catch (error: unknown) {
      logger.error(
        { err: error },
        "❌ Failed to disconnect Redis"
      );

      redis.disconnect();
    }
  };
