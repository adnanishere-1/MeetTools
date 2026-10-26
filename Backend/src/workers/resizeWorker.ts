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
  maxRetriesPerRequest: null, // ⚠️ IMPORTANT: Worker ke liye compulsory hai, warna crash
};

const processResizeJob = async (job: Job) => {
  // ✅ FIX: Controller transformations object bhejta hai — usko sahi se destruct karo
  const { fileId, fileUrl, originalFileName, originalSize, transformations } = job.data;
  const { width, height, quality, format } = transformations || {};

  logger.info(`📐 Resize Job ${job.id} started`);

  try {
    await job.updateProgress(20);

    const transformation: any[] = [];

    // 1. Dimensions with Aspect Ratio Preservation
    if (width || height) {
      transformation.push({
        width: width ? String(width) : undefined,
        height: height ? String(height) : undefined,
        cropMode: 'maintain_ratio',
        focus: 'auto',
      });
    }

    // 2. Quality & Format
    transformation.push({
      quality: quality ? String(quality) : '90',
      format: format || 'webp',
      effectSharpen: '10',
    });

    // Generate final URL
    const resizedUrl = imagekit.url({
      src: fileUrl,
      transformation,
    });

    await job.updateProgress(100);
    logger.info(`✅ Resize Job ${job.id} finished. URL: ${resizedUrl}`);

    // ✅ FIX: Ye fields status controller expect karta hai (result.url, result.fileName...)
    return {
      success: true,
      fileId,
      url: resizedUrl,
      fileName: originalFileName,
      fileSize: originalSize,
      width: width ?? null,
      height: height ?? null,
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

// Optional: Worker errors log karo
resizeWorker.on('failed', (job, err) => {
  logger.error(`💥 Job ${job?.id} failed: ${err.message}`);
});
resizeWorker.on('completed', (job) => {
  logger.info(`🏁 Job ${job.id} completed`);
});