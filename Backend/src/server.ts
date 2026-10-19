// Sab se pehle dotenv load ho iske liye yeh line likhein
import 'dotenv/config';

import app from './app.js';
import { connectDB } from './config/db.js';
import { logger } from './utils/logger.js';
import { redis } from './config/redis.js'; // Ab yeh sahi waqt par env variables ke sath chalega

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // 1. Establish Database Connection
    await connectDB();

    // 2. Start Express Server
    const server = app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
    });

    // Graceful Shutdown Handling
    const handleShutdown = (signal: string) => {
      logger.info(`${signal} signal received: closing HTTP server gracefully...`);
      server.close(async () => {
        logger.info('HTTP server are the closed.');
        // Redis connection bhi close karna acha practice hai
        await redis.quit();
        logger.info('Redis connection are Closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));

  } catch (error) {
    logger.error(`Failed to start the server: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

startServer();