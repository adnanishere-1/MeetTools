import { Worker, Job as BullJob } from 'bullmq';
import ImageKit from 'imagekit';
import { logger } from '../utils/logger.js';
import { redis } from '../config/redis.js';

// ImageKit Instance configuration
const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY || '',
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY || '',
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || '',
});

const processImageJob = async (job: BullJob) => {
  const { userId, fileId, fileUrl, transformations } = job.data;
  
  logger.info(`⚙️ Processing job ID: ${job.id} for user/IP: ${userId}`);

  try {
    await job.updateProgress(20);

    let finalOutputUrl = fileUrl;

    // Resize & Transform Process via ImageKit URL Transformation
    if (transformations) {
      const transformArray: any = [];

      if (transformations.width) transformArray.push({ width: String(transformations.width) });
      if (transformations.height) transformArray.push({ height: String(transformations.height) });
      if (transformations.quality) transformArray.push({ quality: String(transformations.quality) });
      if (transformations.format) transformArray.push({ format: transformations.format });

      // Agar target file size ki zaroorat ho toh ImageKit transformation handle karegi
      finalOutputUrl = imagekit.url({
        src: fileUrl,
        transformation: transformArray,
      });
    }

    await job.updateProgress(100);

    logger.info(`✅ Job ${job.id} processed successfully. Output URL: ${finalOutputUrl}`);

    // Return value jo controller status API mein get hogi
    return {
      success: true,
      url: finalOutputUrl, // Yeh status API mein previewUrl/downloadUrl ban jayegi
      fileId,
    };

  } catch (error: any) {
    logger.error(`❌ Failed to process job ${job.id}: ${error.message}`);
    throw new Error(`Image processing failed: ${error.message}`);
  }
};

// ⚠️ IMPORTANT: Queue name wahi hona chahiye jo aapke controller me use ho raha hai!
// Agar controller me `resizeQueue` hai, toh queue name check kar lein.
export const imageWorker = new Worker('meettools-image-queue', processImageJob, {
  connection: redis,
  concurrency: 5,
});

imageWorker.on('completed', (job) => {
  logger.info(`🎉 BullMQ Job ${job.id} completed successfully.`);
});

imageWorker.on('failed', (job, err) => {
  logger.error(`❌ BullMQ Job ${job?.id ?? 'unknown'} failed: ${err.message}`);
});

logger.info('🚀 MeetTools Image Worker is running and listening for jobs...');