import { Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { STATUS_CODES } from '../utils/statusCodes.js';
import { uploadToImageKit } from '../config/imagekit.js';
import { imageQueue } from '../queues/imageQueue.js';
// (Note: Job model aapke database schema ke mutabiq import hoga)

/**
 * @desc    Upload image and queue for processing/resizing
 * @route   POST /api/v1/upload
 * @access  Private
 */
export const uploadAndResizeImage = asyncHandler(async (req: any, res: Response) => {
  if (!req.file) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Please upload an image file');
  }

  const userId = req.user.id;
  const { width, height, format } = req.body;

  // 1. Optional: Direct upload to ImageKit or push to queue buffer
  const uploadResult = await uploadToImageKit(
    req.file.buffer,
    req.file.originalname,
    '/meettools/uploads'
  );

  // 2. Add job to BullMQ Redis Queue for background processing/resizing
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