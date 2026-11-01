
import mongoose from "mongoose";

import type { Response } from "express";

import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { STATUS_CODES } from "../utils/statusCodes.js";

import { resizeQueue } from "../queues/imageQueue.js";
import { redis } from "../config/redis.js";
import { Job } from "../models/Job.model.js";

import type {
  AuthenticatedRequest,
} from "../middlewares/auth.middleware.js";

// =====================================
// Helpers
// =====================================

const getUserId = (
  req: AuthenticatedRequest
): string => {
  const rawUserId =
    req.user?.id ?? req.user?._id;

  const userId = rawUserId?.toString();

  if (
    !userId ||
    !mongoose.isValidObjectId(userId)
  ) {
    throw new ApiError(
      STATUS_CODES.UNAUTHORIZED,
      "User unauthorized or ID missing."
    );
  }

  return userId;
};

const getObjectIdParam = (
  value: string | string[] | undefined,
  name: string
): string => {
  const id = Array.isArray(value) ? value[0] : value;

  if (!id || !mongoose.isValidObjectId(id)) {
    throw new ApiError(
      STATUS_CODES.BAD_REQUEST,
      `Invalid ${name}`
    );
  }

  return id;
};

const parsePagination = (
  value: unknown,
  fallback: number,
  max: number
): number => {
  if (value === undefined) {
    return fallback;
  }

  if (
    typeof value !== "string" ||
    !/^\d+$/.test(value)
  ) {
    throw new ApiError(
      STATUS_CODES.BAD_REQUEST,
      "Invalid pagination parameter"
    );
  }

  const parsed = Number(value);

  if (
    !Number.isSafeInteger(parsed) ||
    parsed < 1 ||
    parsed > max
  ) {
    throw new ApiError(
      STATUS_CODES.BAD_REQUEST,
      `Pagination value must be between 1 and ${max}`
    );
  }

  return parsed;
};

const validStatuses = new Set([
  "pending",
  "processing",
  "completed",
  "failed",
]);

const getCancellationKey = (jobId: string) =>
  `meetools:cancel-resize:${jobId}`;

// =====================================
// Get User Jobs
// GET /api/v1/jobs
// =====================================

export const getUserJobs = asyncHandler(
  async (
    req: AuthenticatedRequest,
    res: Response
  ) => {
    const userId = getUserId(req);

    const page = parsePagination(req.query.page, 1, 1000000);
    const limit = parsePagination(req.query.limit, 10, 100);

    const status = req.query.status;

    if (
      status !== undefined &&
      (
        typeof status !== "string" ||
        !validStatuses.has(status)
      )
    ) {
      throw new ApiError(
        STATUS_CODES.BAD_REQUEST,
        "Invalid job status"
      );
    }

    const query: {
      userId: string;
      status?: "pending" | "processing" | "completed" | "failed";
    } = { userId };

    if (typeof status === "string") {
      query.status = status as
        | "pending"
        | "processing"
        | "completed"
        | "failed";
    }

    const skip = (page - 1) * limit;

    const [jobs, totalJobs] = await Promise.all([
      Job.find(query)
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Job.countDocuments(query),
    ]);

    return res.status(STATUS_CODES.OK).json({
      success: true,
      count: jobs.length,
      total: totalJobs,
      currentPage: page,
      totalPages: Math.ceil(totalJobs / limit),
      jobs,
      message: "User jobs history retrieved successfully from database",
    });
  }
);

// =====================================
// Get Job By ID
// GET /api/v1/jobs/:jobId
// =====================================

export const getJobById = asyncHandler(
  async (
    req: AuthenticatedRequest,
    res: Response
  ) => {
    const userId = getUserId(req);

    const jobId = getObjectIdParam(
      req.params.jobId,
      "job ID"
    );

    const job = await Job.findOne({
      _id: jobId,
      userId,
    }).lean();

    if (!job) {
      throw new ApiError(
        STATUS_CODES.NOT_FOUND,
        "Job record not found in database"
      );
    }

    return res.status(STATUS_CODES.OK).json(job);
  }
);

// =====================================
// Delete / Cancel Job
// DELETE /api/v1/jobs/:id
// =====================================

export const deleteJob = asyncHandler(
  async (
    req: AuthenticatedRequest,
    res: Response
  ) => {
    const userId = getUserId(req);

    const id = getObjectIdParam(
      req.params.id,
      "job ID"
    );

    // Verify ownership in MongoDB first.
    const dbJob = await Job.findOne({
      _id: id,
      userId,
    });

    if (!dbJob) {
      throw new ApiError(
        STATUS_CODES.NOT_FOUND,
        "Job not found or unauthorized"
      );
    }

    const queueJob = await resizeQueue.getJob(id);

    // If the BullMQ job has already expired,
    // delete only a terminal MongoDB record.
    if (!queueJob) {
      if (
        dbJob.status === "pending" ||
        dbJob.status === "processing"
      ) {
        throw new ApiError(
          STATUS_CODES.CONFLICT,
          "Job is active but its queue record is missing. Please try again later."
        );
      }

      await Job.deleteOne({
        _id: id,
        userId,
      });

      return res.status(STATUS_CODES.OK).json({
        success: true,
        message: "Job deleted successfully",
      });
    }

    const state = await queueJob.getState();

    // Active jobs cannot be force-removed safely.
    // Ask the worker to stop at its next checkpoint.
    if (state === "active") {
      await redis.set(
        getCancellationKey(id),
        "1",
        "EX",
        60 * 60
      );

      return res.status(STATUS_CODES.ACCEPTED).json({
        success: true,
        cancellationRequested: true,
        message:
          "Job cancellation requested. It will stop at the next worker checkpoint. Delete it again after cancellation finishes.",
      });
    }

    // Waiting/delayed jobs can be removed immediately.
    if (
      state === "waiting" ||
      state === "delayed" ||
      state === "prioritized" ||
      state === "waiting-children"
    ) {
      await queueJob.remove();

      await Job.deleteOne({
        _id: id,
        userId,
      });

      await redis.del(getCancellationKey(id));

      return res.status(STATUS_CODES.OK).json({
        success: true,
        message: "Queued job deleted successfully",
      });
    }

    // Completed/failed jobs are safe to remove.
    if (
      state === "completed" ||
      state === "failed"
    ) {
      await queueJob.remove();

      await Job.deleteOne({
        _id: id,
        userId,
      });

      await redis.del(getCancellationKey(id));

      return res.status(STATUS_CODES.OK).json({
        success: true,
        message: "Job deleted successfully",
      });
    }

    throw new ApiError(
      STATUS_CODES.CONFLICT,
      `Job cannot be deleted in its current queue state: ${state}`
    );
  }
);

// =====================================
// Get Queue Job Status
// GET /api/v1/jobs/:jobId/status
// =====================================

export const getJobStatus = asyncHandler(
  async (
    req: AuthenticatedRequest,
    res: Response
  ) => {
    const userId = getUserId(req);

    const jobId = getObjectIdParam(
      req.params.jobId,
      "job ID"
    );

    const ownedJob = await Job.exists({
      _id: jobId,
      userId,
    });

    if (!ownedJob) {
      throw new ApiError(
        STATUS_CODES.NOT_FOUND,
        "Job not found"
      );
    }

    const job = await resizeQueue.getJob(jobId);

    if (!job) {
      throw new ApiError(
        STATUS_CODES.NOT_FOUND,
        "Job not found in queue"
      );
    }

    const state = await job.getState();

    return res.status(STATUS_CODES.OK).json({
      success: true,
      jobId: job.id,
      state,
      progress: job.progress,
      failedReason: job.failedReason || null,
      returnvalue: job.returnvalue || null,
    });
  }
);
