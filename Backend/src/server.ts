
import 'dotenv';  
config();

import app from './app.js';
import { connectDB } from './config/db.js';
import { logger } from './utils/logger.js';
import { redis } from './config/redis.js';

// BullMQ image processing worker
import './workers/resizeWorker.js';
import { config } from 'zod/v4/mini';

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Connect MongoDB
    await connectDB();

    // Start Express server
    const server = app.listen(PORT, () => {
      logger.info(
        `Server is running on port ${PORT} in ${
          process.env.NODE_ENV || 'development'
        } mode`
      );
    });

    // Graceful shutdown
    const handleShutdown = (signal: string) => {
      logger.info(
        `${signal} signal received: closing HTTP server gracefully...`
      );

      server.close(async () => {
        logger.info('HTTP server closed.');

        await redis.quit();

        logger.info('Redis connection closed.');

        process.exit(0);
      });
    };

    process.on('SIGTERM', () =>
      handleShutdown('SIGTERM')
    );

    process.on('SIGINT', () =>
      handleShutdown('SIGINT')
    );
  } catch (error) {
    logger.error(
      `Failed to start the server: ${
        error instanceof Error
          ? error.message
          : String(error)
      }`
    );

    process.exit(1);
  }
}

startServer();
