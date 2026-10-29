
import mongoose from "mongoose";

import type { Response } from "express";

import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { STATUS_CODES } from "../utils/statusCodes.js";

import { imageQueue } from "../queues/imageQueue.js";
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

  const userId =
    rawUserId?.toString();

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
  const id =
    Array.isArray(value)
      ? value[0]
      : value;

  if (
    !id ||
    !mongoose.isValidObjectId(id)
  ) {
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

    const page = parsePagination(
      req.query.page,
      1,
      1000000
    );

    const limit = parsePagination(
      req.query.limit,
      10,
      100
    );

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
    } = {
      userId,
    };

    if (typeof status === "string") {
      query.status = status as
        | "pending"
        | "processing"
        | "completed"
        | "failed";
    }

    const skip = (page - 1) * limit;

    const [jobs, totalJobs] =
      await Promise.all([
        Job.find(query)
          .sort({
            createdAt: -1,
            _id: -1,
          })
          .skip(skip)
          .limit(limit)
          .lean(),

        Job.countDocuments(query),
      ]);

    return res
      .status(STATUS_CODES.OK)
      .json({
        success: true,
        count: jobs.length,
        total: totalJobs,
        currentPage: page,
        totalPages:
          Math.ceil(totalJobs / limit),
        jobs,
        message:
          "User jobs history retrieved successfully from database",
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

    // Preserve existing response format.
    return res
      .status(STATUS_CODES.OK)
      .json(job);
  }
);

// =====================================
// Delete Job
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

    // Prevent deletion of an active job.
    // Deleting a MongoDB record does not
    // automatically stop a BullMQ worker.
    const job =
      await Job.findOneAndDelete({
        _id: id,
        userId,
        status: {
          $in: [
            "completed",
            "failed",
          ],
        },
      });

    if (!job) {
      const existing =
        await Job.exists({
          _id: id,
          userId,
        });

      if (existing) {
        throw new ApiError(
          STATUS_CODES.CONFLICT,
          "Active jobs cannot be deleted until processing finishes"
        );
      }

      throw new ApiError(
        STATUS_CODES.NOT_FOUND,
        "Job not found or unauthorized"
      );
    }

    return res
      .status(STATUS_CODES.OK)
      .json({
        success: true,
        message:
          "Job deleted successfully from database",
      });
  }
);

// =====================================
// Get Queue Job Status
// Existing controller export preserved
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

    // Verify ownership before accessing
    // BullMQ job details.
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

    const job =
      await imageQueue.getJob(jobId);

    if (!job) {
      throw new ApiError(
        STATUS_CODES.NOT_FOUND,
        "Job not found in queue"
      );
    }

    const state = await job.getState();

    return res
      .status(STATUS_CODES.OK)
      .json({
        success: true,
        jobId: job.id,
        state,
        progress: job.progress,
        failedReason:
          job.failedReason || null,
        returnvalue:
          job.returnvalue || null,
      });
  }
);
