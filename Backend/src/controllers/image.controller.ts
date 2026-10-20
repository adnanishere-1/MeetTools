import { Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { STATUS_CODES } from '../utils/statusCodes.js';
import { User } from '../models/User.model.js';
import { uploadToImageKit } from '../config/imagekit.js';
import { resizeQueue, imageQueue } from '../queues/imageQueue.js';
import { logActivity } from '../utils/logActivity.js';

/**
 * @desc    Resize or Compress Image with exact KB/MB Target File Size requirement
 * @route   POST /api/v1/image/resize
 * @access  Private
 */
export const resizeImage = asyncHandler(async (req: any, res: Response) => {
  const userId = req.user.id;
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

  // Target size calculation (KB/MB to Bytes)
  let maxSizeBytes: number | undefined;
  if (targetFileSizeMB) {
    maxSizeBytes = Math.round(targetFileSizeMB * 1024 * 1024);
  } else if (targetFileSizeKB) {
    maxSizeBytes = Math.round(targetFileSizeKB * 1024);
  }

  // 1. Check user credits
  const user = await User.findById(userId);
  if (!user || user.credits <= 0) {
    throw new ApiError(STATUS_CODES.FORBIDDEN, 'Insufficient credits to process image');
  }

  // 2. Upload original image to ImageKit
  const uploadResult = await uploadToImageKit(
    req.file.buffer,
    req.file.originalname,
    '/meettools/resizes'
  );

  // 3. Queue job with BullMQ
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

  // 4. Deduct credit
  user.credits -= 1;
  await user.save();

  // 5. Log activity
  await logActivity({
    userId,
    action: 'IMAGE_RESIZE',
    details: {
      jobId: job.id,
      fileId: uploadResult.fileId,
      targetFileSizeKB,
      targetFileSizeMB,
      originalSizeBytes: req.file.size,
      remainingCredits: user.credits,
    },
    ipAddress: req.ip,
  });

  return res.status(STATUS_CODES.CREATED).json({
    success: true,
    message: 'Image compression/resizing request queued successfully',
    jobId: job.id,
    remainingCredits: user.credits,
    originalFileUrl: uploadResult.url,
  });
});

/**
 * @desc    Upload image and queue for background processing/resizing
 * @route   POST /api/v1/image/upload
 * @access  Private
 */
export const uploadAndResizeImage = asyncHandler(async (req: any, res: Response) => {
  if (!req.file) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Please upload an image file');
  }

  const userId = req.user.id;
  const { width, height, format } = req.body;

  // 1. Direct upload to ImageKit
  const uploadResult = await uploadToImageKit(
    req.file.buffer,
    req.file.originalname,
    '/meettools/uploads'
  );

  // 2. Add job to BullMQ Redis Queue
  const job = await imageQueue.add('resize-image', {
    userId,
    fileId: uploadResult.fileId,
    fileUrl: uploadResult.url,
    options: {
      width: width ? Number(width) : null,
      height: height ? Number(height) : null,
      format: format || 'webp',
    },
  });

  return res.status(STATUS_CODES.CREATED).json({
    success: true,
    message: 'Image uploaded successfully and queued for resizing',
    jobId: job.id,
    file: {
      url: uploadResult.url,
      fileId: uploadResult.fileId,
    },
  });
});