
import "dotenv/config";

import { connectDB } from "./config/db.js";
import { redis } from "./config/redis.js";
import { logger } from "./utils/logger.js";

// =====================================
// Server Configuration
// =====================================

const PORT = Number(process.env.PORT) || 5000;

let isShuttingDown = false;

// =====================================
// Wait For Redis
// =====================================

async function waitForRedis(): Promise<void> {
  if (redis.status === "ready") {
    const result = await redis.ping();

    if (result !== "PONG") {
      throw new Error("Redis health check failed");
    }

    return;
  }

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Redis connection timeout"));
    }, 30000);

    const cleanup = () => {
      clearTimeout(timeout);
      redis.off("ready", onReady);
    };

    const onReady = () => {
      cleanup();
      resolve();
    };

    redis.once("ready", onReady);
  });

  const result = await redis.ping();

  if (result !== "PONG") {
    throw new Error("Redis health check failed");
  }
}

// =====================================
// Start Server
// =====================================

async function startServer(): Promise<void> {
  try {
    // 1. Connect to MongoDB
    await connectDB();

    logger.info("MongoDB connection initialized");

    // 2. Wait for Redis connection
    await waitForRedis();

    logger.info("Redis connection verified successfully.");

    // 3. Import Express app after Redis is ready
    const appModule = await import("./app.js");
    const app = (appModule as unknown as {
      default?: import("express").Express;
      app?: import("express").Express;
    }).default ?? (appModule as unknown as {
      app?: import("express").Express;
    }).app;

    if (!app) {
      throw new Error("Express app export not found");
    }

    // 4. Initialize BullMQ resize worker
    await import("./workers/resizeWorker.js");

    // 5. Start HTTP server
    const server = app.listen(PORT, () => {
      logger.info(
        `Server is running on port ${PORT} in ${
          process.env.NODE_ENV || "development"
        } mode`
      );
    });

    // =====================================
    // Graceful Shutdown
    // =====================================

    const handleShutdown = (signal: string): void => {
      if (isShuttingDown) return;

      isShuttingDown = true;

      logger.info(
        `${signal} received. Shutting down gracefully...`
      );

      server.close(async (error) => {
        if (error) {
          logger.error(
            { err: error },
            "Error closing HTTP server"
          );
        } else {
          logger.info("HTTP server closed");
        }

        try {
          await redis.quit();

          logger.info("Redis connection closed");
        } catch (redisError) {
          logger.error(
            { err: redisError },
            "Failed to close Redis"
          );
        }

        process.exit(error ? 1 : 0);
      });
    };

    process.on("SIGTERM", () => handleShutdown("SIGTERM"));
    process.on("SIGINT", () => handleShutdown("SIGINT"));

  } catch (error) {
    logger.error(
      { err: error },
      "Failed to start server"
    );

    process.exit(1);
  }
}

// =====================================
// Initialize Application
// =====================================

void startServer();
