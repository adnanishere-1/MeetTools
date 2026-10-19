import { Worker, Job } from 'bullmq';
import ImageKit from 'imagekit';
import { logger } from '../utils/logger.js';

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY || '',
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY || '',
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || '',
});

const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
};

const processCleanJob = async (job: Job) => {
  const { userId, fileId, fileUrl } = job.data;
  logger.info(`🧹 Starting CLEAN job ${job.id} for user ${userId}`);

  try {
    await job.updateProgress(30);

    // ImageKit transformation for automatic quality optimization and metadata stripping
    const cleanedUrl = imagekit.url({
      src: fileUrl,
      transformation: [
        {
          quality: '85',
          format: 'auto',
          strip: true, // Remove EXIF metadata
        },
      ],
    });

    await job.updateProgress(100);
    logger.info(`✅ Clean job ${job.id} completed. Cleaned URL: ${cleanedUrl}`);

    return {
      success: true,
      cleanedUrl,
      fileId,
    };
  } catch (error: any) {
    logger.error(`❌ Clean job ${job.id} failed: ${error.message}`);
    throw new Error(`Clean job error: ${error.message}`);
  }
};

export const cleanWorker = new Worker('meettools-clean-queue', processCleanJob, {
  connection: redisConnection,
  concurrency: 10, // Higher concurrency for lightweight tasks
});

cleanWorker.on('completed', (job) => {
  logger.info(`🎉 Clean Job ${job.id} completed successfully.`);
});

cleanWorker.on('failed', (job, err) => {
  logger.error(`❌ Clean Job ${job?.id ?? 'unknown'} failed: ${err.message}`);
});