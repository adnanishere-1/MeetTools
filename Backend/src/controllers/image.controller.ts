import { Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { STATUS_CODES } from '../utils/statusCodes.js';
import { uploadToImageKit } from '../config/imagekit.js';
import { resizeQueue } from '../queues/imageQueue.js';
import { redis } from '../config/redis.js';
import { Job } from '../models/Job.model.js';

const DAILY_LIMIT = 15;
const LIMIT_TTL_SECONDS = 24 * 60 * 60; // 24 Hours

async function checkAndIncrementDailyLimit(identifier: string) {
  const limitKey = `daily_image_limit:${identifier}`;
  
  // ✅ ATOMIC FIX: Pehle increment karein taaki race condition khatam ho jaye
  const currentCount = await redis.incr(limitKey);

  // Agar yeh pehli request hai (count = 1), toh 24 hours ki expiry set kar dein
  if (currentCount === 1) {
    await redis.expire(limitKey, LIMIT_TTL_SECONDS);
  }

  // Agar limit cross ho chuki hai, toh counter wapas decrement karke block kar dein
  if (currentCount > DAILY_LIMIT) {
    await redis.decr(limitKey);
    return { allowed: false, remaining: 0 };
  }

  return { allowed: true, remaining: DAILY_LIMIT - currentCount };
}

/**
 * @desc    Resize or Compress Image
 * @route   POST /api/v1/images/resize
 * @access  Private / Guest
 */
export const resizeImage = asyncHandler(async (req: any, res: Response) => {
  console.log("🔥 [BACKEND API HIT] POST /api/v1/images/resize called!");

  const userId = req.user?.id;
  const identifier = userId || req.ip;
  const {
    width,
    height,
    quality,
    format,
    targetFileSizeKB,
    targetFileSizeMB,
    preserveResolution,
  } = req.body;

  if (!req.file) {
    console.log("❌ Error: No file uploaded in request");
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Please upload an image file');
  }

  console.log(`📁 File received: ${req.file.originalname} (${req.file.size} bytes)`);

  const limitCheck = await checkAndIncrementDailyLimit(identifier);
  if (!limitCheck.allowed) {
    console.log(`⚠️ Rate limit exceeded for identifier: ${identifier}`);
    throw new ApiError(
      STATUS_CODES.TOO_MANY_REQUESTS,
      'You have reached your daily limit of 15 images. Please try again after 24 hours.'
    );
  }

  let maxSizeBytes: number | undefined;
  if (targetFileSizeMB) {
    maxSizeBytes = Math.round(targetFileSizeMB * 1024 * 1024);
  } else if (targetFileSizeKB) {
    maxSizeBytes = Math.round(targetFileSizeKB * 1024);
  }

  // ✅ Safety Check: Quality ko max 100 tak limit karein taaki Mongoose validation fail na ho
  const parsedQuality = quality ? Math.min(Number(quality), 100) : 90;

  // 1. Upload original image to ImageKit temporarily
  console.log("☁️ Uploading original file to ImageKit...");
  const uploadResult = await uploadToImageKit(
    req.file.buffer,
    req.file.originalname,
    '/meettools/resizes'
  );
  console.log("✅ ImageKit Upload Success. File ID:", uploadResult.fileId);

  // 2. MongoDB mein initial Job record create karein
  const dbJob = await Job.create({
    userId: userId || undefined,
    status: 'pending',
    progress: 0,
    inputFiles: [
      {
        fileId: uploadResult.fileId,
        url: uploadResult.url,
        fileName: req.file.originalname,
        fileSize: req.file.size,
      },
    ],
    options: {
      mode: 'exact',
      width: width ? Number(width) : undefined,
      height: height ? Number(height) : undefined,
      outputFormat: format || 'webp',
      quality: parsedQuality,
      maintainAspectRatio: true,
    },
  });
  console.log("📝 MongoDB Job record created with ID:", dbJob._id);

  // 3. Queue job with BullMQ
  const bullJob = await resizeQueue.add('meettools-resize-job', {
    dbJobId: dbJob._id,
    userId: identifier,
    fileId: uploadResult.fileId,
    fileUrl: uploadResult.url,
    originalFileName: req.file.originalname,
    originalSize: req.file.size,
    transformations: {
      width: width ? Number(width) : undefined,
      height: height ? Number(height) : undefined,
      maxSizeBytes,
      quality: parsedQuality,
      format: format || 'webp',
      preserveResolution: preserveResolution ?? true,
    },
  });
  console.log("⚙️ BullMQ Job added successfully with ID:", bullJob.id);

  return res.status(STATUS_CODES.CREATED).json({
    success: true,
    message: 'Image compression/resizing request queued successfully',
    jobId: bullJob.id,
    dbJobId: dbJob._id,
    remainingImagesToday: limitCheck.remaining,
  });
});

/**
 * @desc    Upload image and queue for background processing/resizing
 * @route   POST /api/v1/images/upload
 * @access  Private / Guest
 */
export const uploadAndResizeImage = asyncHandler(async (req: any, res: Response) => {
  console.log("🔥 [BACKEND API HIT] POST /api/v1/images/upload called!");

  if (!req.file) {
    console.log("❌ Error: No file uploaded in upload route");
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Please upload an image file');
  }

  const userId = req.user?.id;
  const identifier = userId || req.ip;
  const { width, height, format, quality } = req.body;
  const parsedQuality = quality ? Math.min(Number(quality), 100) : 90;

  const limitCheck = await checkAndIncrementDailyLimit(identifier);
  if (!limitCheck.allowed) {
    console.log(`⚠️ Rate limit exceeded for identifier: ${identifier}`);
    throw new ApiError(
      STATUS_CODES.TOO_MANY_REQUESTS,
      'You have reached your daily limit of 15 images. Please try again after 24 hours.'
    );
  }

  const uploadResult = await uploadToImageKit(
    req.file.buffer,
    req.file.originalname,
    '/meettools/uploads'
  );

  const dbJob = await Job.create({
    userId: userId || undefined,
    status: 'pending',
    progress: 0,
    inputFiles: [
      {
        fileId: uploadResult.fileId,
        url: uploadResult.url,
        fileName: req.file.originalname,
        fileSize: req.file.size,
      },
    ],
    options: {
      mode: 'fit',
      width: width ? Number(width) : undefined,
      height: height ? Number(height) : undefined,
      outputFormat: format || 'webp',
      quality: parsedQuality,
      maintainAspectRatio: true,
    },
  });

  const bullJob = await resizeQueue.add('resize-image', {
    dbJobId: dbJob._id,
    userId: identifier,
    fileId: uploadResult.fileId,
    fileUrl: uploadResult.url,
    originalFileName: req.file.originalname,
    originalSize: req.file.size,
    transformations: {
      width: width ? Number(width) : undefined,
      height: height ? Number(height) : undefined,
      quality: parsedQuality,
      format: format || 'webp',
    },
  });

  return res.status(STATUS_CODES.CREATED).json({
    success: true,
    message: 'Image uploaded successfully and queued for resizing',
    jobId: bullJob.id,
    dbJobId: dbJob._id,
    remainingImagesToday: limitCheck.remaining,
  });
});

/**
 * @desc    Check background job status and get processed download/preview URL
 * @route   GET /api/v1/images/status/:jobId
 * @access  Private / Guest
 */
export const getJobResultStatus = asyncHandler(async (req: any, res: Response) => {
  const { jobId } = req.params;
  console.log(`🔍 [STATUS CHECK] Checking status for Job ID: ${jobId}`);

  const job = await resizeQueue.getJob(jobId);

  if (!job) {
    console.log(`❌ Job not found in queue: ${jobId}`);
    throw new ApiError(STATUS_CODES.NOT_FOUND, 'Job not found or expired');
  }

  const isCompleted = await job.isCompleted();
  const isFailed = await job.isFailed();

  if (isFailed) {
    console.log(`❌ Job failed in background worker: ${jobId}`);
    if (job.data.dbJobId) {
      await Job.findByIdAndUpdate(job.data.dbJobId, { status: 'failed' });
    }
    return res.status(STATUS_CODES.OK).json({
      success: false,
      status: 'failed',
      message: 'Image processing failed in background worker',
      failedReason: job.failedReason,
    });
  }

  if (!isCompleted) {
    console.log(`⏳ Job is still processing... ID: ${jobId}`);
    return res.status(STATUS_CODES.OK).json({
      success: true,
      status: 'processing',
      message: 'Image is still processing in background...',
    });
  }

  const result = job.returnvalue;
  console.log(`✨ Job completed successfully! ID: ${jobId}`);

  if (job.data.dbJobId && result) {
    await Job.findByIdAndUpdate(job.data.dbJobId, {
      status: 'completed',
      progress: 100,
      completedAt: new Date(),
      outputFiles: [
        {
          fileId: result.fileId,
          url: result.url,
          fileName: result.fileName,
          fileSize: result.fileSize,
          width: result.width,
          height: result.height,
        },
      ],
    });
  }

  return res.status(STATUS_CODES.OK).json({
    success: true,
    status: 'completed',
    message: 'Image processed successfully and details saved to database',
    previewUrl: result?.url,
    downloadUrl: result?.url,
    fileDetails: {
      fileId: result?.fileId,
      fileName: result?.fileName,
      fileSize: result?.fileSize,
      width: result?.width,
      height: result?.height,
    },
  });
});