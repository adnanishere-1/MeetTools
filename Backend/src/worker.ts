import dotenv from 'dotenv';
dotenv.config(); // Sabse pehle env load hoga

import { Worker, Job as BullJob } from 'bullmq';
import { logger } from './utils/logger.js';
import { imagekit } from './config/imagekit.js';

// ⚠️ Zaroori: BullMQ ke liye maxRetriesPerRequest ko null rakhna lazmi hai
const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  maxRetriesPerRequest: null, // 👈 Yeh line add karni zaroori thi!
};

async function startWorker() {
  logger.info('🚀 MeetTools Background Worker is starting...');

  const worker = new Worker(
    'meettools-resize-queue',
    async (bullJob: BullJob) => {
      const { userId, fileId, fileUrl, transformations } = bullJob.data;
      logger.info(`⚙️ Processing job ID: ${bullJob.id} for user: ${userId}`);

      try {
        await bullJob.updateProgress(20);

        let finalOutputUrl = fileUrl;

        // ImageKit Transformations apply karna
        if (transformations) {
          const transformArray: any = [];

          if (transformations.width) transformArray.push({ width: String(transformations.width) });
          if (transformations.height) transformArray.push({ height: String(transformations.height) });
          if (transformations.quality) transformArray.push({ quality: String(transformations.quality) });
          if (transformations.format) transformArray.push({ format: transformations.format });

          finalOutputUrl = imagekit.url({
            src: fileUrl,
            transformation: transformArray,
          });
        }

        await bullJob.updateProgress(100);
        logger.info(`✅ Successfully completed job ID: ${bullJob.id}. Output URL: ${finalOutputUrl}`);

        return {
          success: true,
          url: finalOutputUrl,
          downloadUrl: finalOutputUrl,
          fileId,
        };

      } catch (error: any) {
        logger.error(`❌ Error processing job ${bullJob.id}:`, error);
        throw error;
      }
    },
    {
      connection: redisConnection,
      concurrency: 2,
    }
  );

  worker.on('completed', (job) => {
    logger.info(`🎉 BullMQ Job completed: ${job.id}`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`❌ BullMQ Job failed: ${job?.id} with error: ${err.message}`);
  });
}

startWorker().catch((err) => {
  logger.error('❌ Worker failed to start:', err);
  process.exit(1);
});