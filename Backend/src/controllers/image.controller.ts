import { Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { STATUS_CODES } from '../utils/statusCodes.js';
import { uploadToImageKit } from '../config/imagekit.js';
import { resizeQueue } from '../queues/imageQueue.js'; // 👈 Sirf resizeQueue use karein
import { redis } from '../config/redis.js';
import { logActivity } from '../utils/logActivity.js';

const DAILY_LIMIT = 15;
const LIMIT_TTL_SECONDS = 24 * 60 * 60; // 24 Hours

/**
 * Helper: Check and increment daily limit in Redis
 */
async function checkAndIncrementDailyLimit(identifier: string) {
  const limitKey = `daily_image_limit:${identifier}`;
  const currentCountStr = await redis.get(limitKey);
  const currentCount = currentCountStr ? parseInt(currentCountStr, 10) : 0;

  if (currentCount >= DAILY_LIMIT) {
    return { allowed: false, remaining: 0 };
  }

  // Increment usage
  if (currentCount === 0) {
    await redis.set(limitKey, 1, 'EX', LIMIT_TTL_SECONDS);
  } else {
    await redis.incr(limitKey);
  }

  return { allowed: true, remaining: DAILY_LIMIT - (currentCount + 1) };
}

/**
 * @desc    Resize or Compress Image with exact KB/MB Target File Size requirement (15 images/day limit)
 * @route   POST /api/v1/images/resize
 * @access  Private
 */
export const resizeImage = asyncHandler(async (req: any, res: Response) => {
  const userId = req.user?.id || req.ip;
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

  // 1. Check Daily Limit
  const limitCheck = await checkAndIncrementDailyLimit(userId);
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

  // 2. Upload original image to ImageKit
  const uploadResult = await uploadToImageKit(
    req.file.buffer,
    req.file.originalname,
    '/meettools/resizes'
  );

  // 3. Queue job with BullMQ (Using resizeQueue)
  const job = await resizeQueue.add('meettools-resize-job', {
    userId,
    fileId: uploadResult.fileId,
    fileUrl: uploadResult.url,
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

  // 4. Log activity
  await logActivity({
    userId: req.user?.id || null,
    action: 'IMAGE_RESIZE',
    details: {
      jobId: job.id,
      fileId: uploadResult.fileId,
      remainingDailyLimit: limitCheck.remaining,
    },
    ipAddress: req.ip,
  });

  return res.status(STATUS_CODES.CREATED).json({
    success: true,
    message: 'Image compression/resizing request queued successfully',
    jobId: job.id,
    remainingImagesToday: limitCheck.remaining,
    originalFileUrl: uploadResult.url,
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

  const userId = req.user?.id || req.ip;
  const { width, height, format } = req.body;

  // Check Daily Limit
  const limitCheck = await checkAndIncrementDailyLimit(userId);
  if (!limitCheck.allowed) {
    throw new ApiError(
      STATUS_CODES.TOO_MANY_REQUESTS,
      'You have reached your daily limit of 15 images. Please try again after 24 hours.'
    );
  }

  // 1. Direct upload to ImageKit
  const uploadResult = await uploadToImageKit(
    req.file.buffer,
    req.file.originalname,
    '/meettools/uploads'
  );

  // 2. Add job to resizeQueue instead of imageQueue
  const job = await resizeQueue.add('resize-image', {
    userId,
    fileId: uploadResult.fileId,
    fileUrl: uploadResult.url,
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
    jobId: job.id,
    remainingImagesToday: limitCheck.remaining,
    file: {
      url: uploadResult.url,
      fileId: uploadResult.fileId,
    },
  });
});

/**
 * @desc    Check background job status and get processed download/preview URL
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

  return res.status(STATUS_CODES.OK).json({
    success: true,
    status: 'completed',
    message: 'Image processed successfully',
    previewUrl: result?.url || result?.downloadUrl,
    downloadUrl: result?.url || result?.downloadUrl,
    fileId: result?.fileId,
  });
});