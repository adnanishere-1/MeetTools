import { Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { STATUS_CODES } from '../utils/statusCodes.js';
import { imageQueue } from '../queues/index.js';

/**
 * @desc    Get Job Processing Status
 * @route   GET /api/v1/jobs/:jobId
 * @access  Private
 */
export const getJobStatus = asyncHandler(async (req: any, res: Response) => {
  const { jobId } = req.params;

  const job = await imageQueue.getJob(jobId);

  if (!job) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, 'Job not found in queue');
  }

  const state = await job.getState();
  const progress = job.progress;

  return res.status(STATUS_CODES.OK).json({
    success: true,
    jobId: job.id,
    state, // 'completed' | 'failed' | 'active' | 'waiting'
    progress,
    failedReason: job.failedReason || null,
    returnvalue: job.returnvalue || null,
  });
});

/**
 * @desc    Get User Jobs History summary
 * @route   GET /api/v1/jobs
 * @access  Private
 */
export const getUserJobs = asyncHandler(async (req: any, res: Response) => {
  // Get active, waiting, completed, and failed jobs from BullMQ or database
  const completed = await imageQueue.getCompleted();
  const active = await imageQueue.getActive();
  const waiting = await imageQueue.getWaiting();

  return res.status(STATUS_CODES.OK).json({
    success: true,
    counts: {
      active: active.length,
      waiting: waiting.length,
      completed: completed.length,
    },
    message: 'Job statistics retrieved successfully for MeetTools',
  });
});