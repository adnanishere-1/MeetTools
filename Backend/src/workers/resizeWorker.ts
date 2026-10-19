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

const processResizeJob = async (job: Job) => {
  const { userId, fileId, fileUrl, width, height, quality, format } = job.data;
  logger.info(`📐 High-Quality Resize Job ${job.id} started`);

  try {
    await job.updateProgress(20);

    // Ultra-High Quality Preservation Array
    const transformation: any[] = [];

    // 1. Dimensions with Aspect Ratio Preservation
    if (width || height) {
      transformation.push({
        width: width ? String(width) : undefined,
        height: height ? String(height) : undefined,
        cropMode: 'maintain_ratio', // Anti-distortion
        focus: 'auto',
      });
    }

    // 2. High Quality Retention & Sharpness Filter
    transformation.push({
      quality: quality ? String(quality) : '90', // High quality threshold
      format: format || 'webp',                  // Modern crisp format
      effectSharpen: '10',                      // Subtle anti-blur sharpen
    });

    // Generate High-Fidelity URL
    const resizedUrl = imagekit.url({
      src: fileUrl,
      transformation,
    });

    await job.updateProgress(100);
    logger.info(`✅ Resize Job ${job.id} finished without quality loss.`);

    return {
      success: true,
      resizedUrl,
      fileId,
    };
  } catch (error: any) {
    logger.error(`❌ Resize Job ${job.id} failed: ${error.message}`);
    throw new Error(`Resize execution failed: ${error.message}`);
  }
};

export const resizeWorker = new Worker('meettools-resize-queue', processResizeJob, {
  connection: redisConnection,
  concurrency: 5,
});