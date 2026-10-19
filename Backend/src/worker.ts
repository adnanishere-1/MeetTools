import { Worker, Job as BullJob } from 'bullmq';
import { redis } from './config/redis.js';
import { logger } from './utils/logger.js';
import { Job } from './models/Job.model.js';
import { connectDB, disconnectDB } from './config/db.js';

// Database connect karna zaroori hai taaki worker MongoDB me jobs update kar sake
async function startWorker() {
  await connectDB();

  logger.info('🚀 SnapResize Background Worker is starting...');

  const worker = new Worker(
    'image-resize-queue',
    async (bullJob: BullJob) => {
      const { jobId } = bullJob.data;
      logger.info(`⚙️ Processing job ID: ${jobId}`);

      try {
        // 1. Database se job find karein
        const job = await Job.findById(jobId);
        if (!job) {
          throw new Error(`Job not found in database: ${jobId}`);
        }

        // 2. Status update to processing
        job.status = 'processing';
        job.progress = 10;
        await job.save();

        // TODO: Yahan ImageKit se images download karke 'sharp' library ke zariye resize/process hongi
        // Aur phir wapas ImageKit par upload kar ke outputFiles array bhara jayega.

        // Simulation ke liye progress bar update kar rahe hain
        for (let i = 20; i <= 90; i += 30) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          job.progress = i;
          await job.save();
          logger.info(`🔄 Job ${jobId} progress: ${i}%`);
        }

        // 3. Job Completed Status
        job.status = 'completed';
        job.progress = 100;
        job.completedAt = new Date();
        // Temporary dummy output files
        job.outputFiles = job.inputFiles.map((file) => ({
          fileId: file.fileId,
          url: `${process.env.IMAGEKIT_URL_ENDPOINT}/resized-${file.fileName}`,
          fileName: `resized-${file.fileName}`,
          fileSize: file.fileSize,
          width: file.width || 800,
          height: file.height || 600,
        }));
        
        await job.save();
        logger.info(`✅ Successfully completed job ID: ${jobId}`);
      } catch (error: any) {
        logger.error(`❌ Error processing job ${jobId}:`, error);
        
        // Error status update in DB
        await Job.findByIdAndUpdate(jobId, {
          status: 'failed',
          error: {
            message: error.message || 'Unknown processing error',
            code: 'PROCESSING_FAILED',
          },
        });
        throw error;
      }
    },
    {
      connection: redis,
      concurrency: 2, // Ek waqt mein maximum 2 jobs process hongi taaki server overload na ho
    }
  );

  worker.on('completed', (job) => {
    logger.info(`🎉 BullMQ Job completed: ${job.id}`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`❌ BullMQ Job failed: ${job?.id} with error: ${err.message}`);
  });
}

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received. Closing worker and database...');
  await disconnectDB();
  process.exit(0);
});

startWorker().catch((err) => {
  logger.error('❌ Worker failed to start:', err);
  process.exit(1);
});