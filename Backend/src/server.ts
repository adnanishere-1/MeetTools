import { config } from "dotenv";
import "dotenv";
config();

import app from "./app.js";
import { connectDB } from "./config/db.js";
import { redis } from "./config/redis.js";
import { logger } from "./utils/logger.js";

// BullMQ image processing worker
import "./workers/resizeWorker.js";



const PORT = Number(process.env.PORT) || 5000;

let isShuttingDown = false;

async function startServer(): Promise<void> {
  try {
    await connectDB();

    const server = app.listen(PORT, () => {
      logger.info(
        `Server is running on port ${PORT} in ${
          process.env.NODE_ENV || "development"
        } mode`
      );
    });

    const handleShutdown = (signal: string): void => {
      if (isShuttingDown) {
        return;
      }

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

    process.on("SIGTERM", () => {
      handleShutdown("SIGTERM");
    });

    process.on("SIGINT", () => {
      handleShutdown("SIGINT");
    });
  } catch (error) {
    logger.error(
      { err: error },
      "Failed to start server"
    );

    process.exit(1);
  }
}

void startServer();
