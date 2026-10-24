import { Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { STATUS_CODES } from '../utils/statusCodes.js';
import { uploadToImageKit } from '../config/imagekit.js';
import { resizeQueue } from '../queues/imageQueue.js';
import { redis } from '../config/redis.js';
import { logActivity } from '../utils/logActivity.js';
import { Job } from '../models/Job.model.js'; // 👈 MongoDB Job Model import kiya

const DAILY_LIMIT = 15;
const LIMIT_TTL_SECONDS = 24 * 60 * 60; // 24 Hours

async function checkAndIncrementDailyLimit(identifier: string) {
  const limitKey = `daily_image_limit:${identifier}`;
  const currentCountStr = await redis.get(limitKey);
  const currentCount = currentCountStr ? parseInt(currentCountStr, 10) : 0;

  if (currentCount >= DAILY_LIMIT) {
    return { allowed: false, remaining: 0 };
  }

  if (currentCount === 0) {
    await redis.set(limitKey, 1, 'EX', LIMIT_TTL_SECONDS);
  } else {
    await redis.incr(limitKey);
  }

  return { allowed: true, remaining: DAILY_LIMIT - (currentCount + 1) };
}

/**
 * @desc    Resize or Compress Image
 * @route   POST /api/v1/images/resize
 * @access  Private
 */
export const resizeImage = asyncHandler(async (req: any, res: Response) => {
  const userId = req.user?.id; // Agar authenticated user ID ho
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
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Please upload an image file');
  }

  const limitCheck = await checkAndIncrementDailyLimit(identifier);
  if (!limitCheck.allowed) {
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

  // 1. Upload original image to ImageKit temporarily
  const uploadResult = await uploadToImageKit(
    req.file.buffer,
    req.file.originalname,
    '/meettools/resizes'
  );

  // 2. MongoDB mein initial Job record create karein ('pending' status ke sath)
  const dbJob = await Job.create({
    userId: userId || undefined, // Agar user logged in hai
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
      quality: quality ? Number(quality) : 85,
      maintainAspectRatio: true,
    },
  });

  // 3. Queue job with BullMQ (dbJob._id pass kar rahe hain taaki status track ho sakay)
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
      quality: quality ? Number(quality) : 85,
      format: format || 'webp',
      preserveResolution: preserveResolution ?? true,
    },
  });

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
 * @access  Private
 */
export const uploadAndResizeImage = asyncHandler(async (req: any, res: Response) => {
  if (!req.file) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Please upload an image file');
  }

  const userId = req.user?.id;
  const identifier = userId || req.ip;
  const { width, height, format } = req.body;

  const limitCheck = await checkAndIncrementDailyLimit(identifier);
  if (!limitCheck.allowed) {
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
      quality: 85,
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
      quality: 85,
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
 * @desc    Check background job status and get processed download/preview URL + Populate actual details in DB
 * @route   GET /api/v1/images/status/:jobId
 * @access  Private
 */
export const getJobResultStatus = asyncHandler(async (req: any, res: Response) => {
  const { jobId } = req.params;

  const job = await resizeQueue.getJob(jobId);

  if (!job) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, 'Job not found or expired');
  }

  const isCompleted = await job.isCompleted();
  const isFailed = await job.isFailed();

  if (isFailed) {
    // DB mein bhi failed status update kar dein agar dbJobId ho
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
    return res.status(STATUS_CODES.OK).json({
      success: true,
      status: 'processing',
      message: 'Image is still processing in background...',
    });
  }

  const result = job.returnvalue;

  // 🔄 POPULATE STEP: Job complete hone par MongoDB mein actual resized details save karna
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