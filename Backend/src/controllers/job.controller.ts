import { Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { STATUS_CODES } from '../utils/statusCodes.js';
import { imageQueue } from '../queues/imageQueue.js';
import { Job } from '../models/Job.model.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';

export const getUserJobs = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id || req.user?._id;

  if (!userId) {
    throw new ApiError(STATUS_CODES.UNAUTHORIZED, 'User unauthorized or ID missing.');
  }

  const { page = 1, limit = 10, status } = req.query;
  const query: any = { userId };
  if (status) query.status = status;

  const skip = (Number(page) - 1) * Number(limit);
  const jobs = await Job.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit));
  const totalJobs = await Job.countDocuments(query);

  return res.status(STATUS_CODES.OK).json({
    success: true,
    count: jobs.length,
    total: totalJobs,
    currentPage: Number(page),
    totalPages: Math.ceil(totalJobs / Number(limit)),
    jobs,
    message: 'User jobs history retrieved successfully from database',
  });
});

export const getJobById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { jobId } = req.params;
  const userId = req.user?.id || req.user?._id;

  const job = await Job.findOne({ _id: jobId, userId });

  if (!job) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, 'Job record not found in database');
  }

  return res.status(STATUS_CODES.OK).json(job);
});

export const deleteJob = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id || req.user?._id;

  const job = await Job.findOneAndDelete({ _id: id, userId });

  if (!job) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, 'Job not found or unauthorized');
  }

  return res.status(STATUS_CODES.OK).json({
    success: true,
    message: 'Job deleted successfully from database',
  });
});

export const getJobStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { jobId } = req.params;
  const normalizedJobId = Array.isArray(jobId) ? jobId[0] : jobId;
  const job = normalizedJobId ? await imageQueue.getJob(normalizedJobId) : null;

  if (!job) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, 'Job not found in queue');
  }

  const state = await job.getState();
  const progress = job.progress;

  return res.status(STATUS_CODES.OK).json({
    success: true,
    jobId: job.id,
    state,
    progress,
    failedReason: job.failedReason || null,
    returnvalue: job.returnvalue || null,
  });
});
