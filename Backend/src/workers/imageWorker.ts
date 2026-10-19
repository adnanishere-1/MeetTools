import { Worker, Job } from 'bullmq';
import ImageKit from 'imagekit';
import { logger } from '../utils/logger.js';

// ImageKit Instance configuration
const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY || '',
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY || '',
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || '',
});

// Redis connection config for BullMQ worker
const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
};

const processImageJob = async (job: Job) => {
  const { userId, fileId, fileUrl, transformations, taskType } = job.data;
  
  logger.info(`⚙️ Processing job ${job.id} for user ${userId} with task: ${taskType || 'resize'}`);

  try {
    // Progress update
    await job.updateProgress(20);

    let finalOutputUrl = fileUrl;

    // 1. Clean Process (Background removal simulation or metadata stripping via ImageKit)
    if (taskType === 'clean') {
      // ImageKit URL transformation for optimization/cleaning
      finalOutputUrl = imagekit.url({
        src: fileUrl,
        transformation: [
          { quality: '90', format: 'auto' },
        ],
      });
    } 
    // 2. Resize & Transform Process
    else if (transformations) {
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

    await job.updateProgress(80);

    logger.info(`✅ Job ${job.id} processed successfully. Output URL: ${finalOutputUrl}`);

    await job.updateProgress(100);

    return {
      success: true,
      processedUrl: finalOutputUrl,
      fileId,
    };

  } catch (error: any) {
    logger.error(`❌ Failed to process job ${job.id}: ${error.message}`);
    throw new Error(`Image processing failed: ${error.message}`);
  }
};

// Initialize BullMQ Worker
export const imageWorker = new Worker('meettools-image-queue', processImageJob, {
  connection: redisConnection,
  concurrency: 5, // Simultaneous background tasks
});

imageWorker.on('completed', (job) => {
  logger.info(`🎉 Job ${job.id} has completed successfully.`);
});

imageWorker.on('failed', (job, err) => {
  logger.error(`❌ Job ${job?.id ?? 'unknown'} has failed with error: ${err.message}`);
});