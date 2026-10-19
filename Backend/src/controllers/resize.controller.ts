import { Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { STATUS_CODES } from '../utils/statusCodes.js';
import { User } from '../models/User.model.js';
import { uploadToImageKit } from '../config/imagekit.js';
import { resizeQueue } from '../queues/imageQueue.js';
import { logActivity } from '../utils/logActivity.js';

/**
 * @desc    Resize image with resolution preservation and activity tracking
 * @route   POST /api/v1/resize
 * @access  Private
 */
export const resizeImage = asyncHandler(async (req: any, res: Response) => {
  const userId = req.user.id;
  const { width, height, quality, format } = req.body;

  if (!req.file) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Please upload an image file');
  }

  // 1. Check user credits
  const user = await User.findById(userId);
  if (!user || user.credits <= 0) {
    throw new ApiError(STATUS_CODES.FORBIDDEN, 'Insufficient credits to resize image');
  }

  // 2. Upload original image to ImageKit
  const uploadResult = await uploadToImageKit(
    req.file.buffer,
    req.file.originalname,
    '/meettools/resizes'
  );

  // 3. Queue high-quality resize job
  const job = await resizeQueue.add('meettools-resize-job', {
    userId,
    fileId: uploadResult.fileId,
    fileUrl: uploadResult.url,
    transformations: {
      width: width ? Number(width) : undefined,
      height: height ? Number(height) : undefined,
      quality: quality ? Number(quality) : 90,
      format: format || 'webp',
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
      dimensions: { width, height },
      remainingCredits: user.credits,
    },
    ipAddress: req.ip,
  });

  return res.status(STATUS_CODES.CREATED).json({
    success: true,
    message: 'Image resize request queued successfully',
    jobId: job.id,
    remainingCredits: user.credits,
    originalFileUrl: uploadResult.url,
  });
});