
import mongoose from "mongoose";
import crypto from "node:crypto";

import type {
  Request,
  Response,
} from "express";

import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { STATUS_CODES } from "../utils/statusCodes.js";

import {
  uploadToImageKit,
  deleteFromImageKit,
} from "../config/imagekit.js";

import { resizeQueue } from "../queues/imageQueue.js";
import { redis } from "../config/redis.js";
import { Job } from "../models/Job.model.js";

// =====================================
// Configuration
// =====================================

const DAILY_LIMIT = 15;
const LIMIT_TTL_SECONDS = 24 * 60 * 60;

const MAX_DIMENSION = 10000;
const MAX_TARGET_SIZE_MB = 100;

const ALLOWED_FORMATS = new Set([
  "jpeg",
  "png",
  "webp",
  "avif",
]);

// =====================================
// Request Types
// =====================================

type ImageRequest = Request & {
  user?: {
    id?: string;
    _id?: string | mongoose.Types.ObjectId;
  };
};

// =====================================
// Helpers
// =====================================

function getAuthenticatedUserId(
  req: ImageRequest
): string | undefined {
  const rawUserId =
    req.user?.id ??
    req.user?._id?.toString();

  if (!rawUserId) {
    return undefined;
  }

  if (!mongoose.isValidObjectId(rawUserId)) {
    throw new ApiError(
      STATUS_CODES.UNAUTHORIZED,
      "Invalid authenticated user"
    );
  }

  return rawUserId;
}

function getClientIdentifier(
  req: ImageRequest,
  userId?: string
): string {
  if (userId) {
    return `user:${userId}`;
  }

  const ip = req.ip;

  if (!ip) {
    throw new ApiError(
      STATUS_CODES.BAD_REQUEST,
      "Unable to identify guest request"
    );
  }

  return `guest:${ip}`;
}

function parseOptionalDimension(
  value: unknown,
  field: string
): number | undefined {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return undefined;
  }

  const parsed = Number(value);

  if (
    !Number.isInteger(parsed) ||
    parsed < 1 ||
    parsed > MAX_DIMENSION
  ) {
    throw new ApiError(
      STATUS_CODES.BAD_REQUEST,
      `${field} must be an integer between 1 and ${MAX_DIMENSION}`
    );
  }

  return parsed;
}

function parseQuality(
  value: unknown
): number {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return 90;
  }

  const parsed = Number(value);

  if (
    !Number.isInteger(parsed) ||
    parsed < 10 ||
    parsed > 100
  ) {
    throw new ApiError(
      STATUS_CODES.BAD_REQUEST,
      "Quality must be between 10 and 100"
    );
  }

  return parsed;
}

function parseFormat(
  value: unknown
): "jpeg" | "png" | "webp" | "avif" {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return "webp";
  }

  if (
    typeof value !== "string" ||
    !ALLOWED_FORMATS.has(value)
  ) {
    throw new ApiError(
      STATUS_CODES.BAD_REQUEST,
      "Unsupported output format"
    );
  }

  return value as
    | "jpeg"
    | "png"
    | "webp"
    | "avif";
}

function parsePreserveResolution(
  value: unknown
): boolean {
  if (value === undefined) {
    return true;
  }

  if (value === true || value === "true") {
    return true;
  }

  if (value === false || value === "false") {
    return false;
  }

  throw new ApiError(
    STATUS_CODES.BAD_REQUEST,
    "preserveResolution must be true or false"
  );
}

function parseTargetSize(
  kb: unknown,
  mb: unknown
): number | undefined {
  const hasKB =
    kb !== undefined &&
    kb !== null &&
    kb !== "";

  const hasMB =
    mb !== undefined &&
    mb !== null &&
    mb !== "";

  if (hasKB && hasMB) {
    throw new ApiError(
      STATUS_CODES.BAD_REQUEST,
      "Provide targetFileSizeKB or targetFileSizeMB, not both"
    );
  }

  if (!hasKB && !hasMB) {
    return undefined;
  }

  const value = Number(
    hasMB ? mb : kb
  );

  const max =
    hasMB
      ? MAX_TARGET_SIZE_MB
      : MAX_TARGET_SIZE_MB * 1024;

  if (
    !Number.isFinite(value) ||
    value <= 0 ||
    value > max
  ) {
    throw new ApiError(
      STATUS_CODES.BAD_REQUEST,
      "Invalid target file size"
    );
  }

  return Math.round(
    value * (hasMB ? 1024 * 1024 : 1024)
  );
}

// Atomic INCR + first-request expiry.
//
// This is a fixed 24-hour window starting
// from the first accepted request.
const DAILY_LIMIT_SCRIPT = `
local count = redis.call("INCR", KEYS[1])

if count == 1 then
  redis.call("EXPIRE", KEYS[1], ARGV[1])
end

if count > tonumber(ARGV[2]) then
  redis.call("DECR", KEYS[1])
  return -1
end

return count
`;

async function checkAndIncrementDailyLimit(
  identifier: string
): Promise<{
  allowed: boolean;
  remaining: number;
}> {
  const key =
    `daily_image_limit:${identifier}`;

  const result = await redis.eval(
    DAILY_LIMIT_SCRIPT,
    1,
    key,
    LIMIT_TTL_SECONDS,
    DAILY_LIMIT
  );

  const count = Number(result);

  if (!Number.isFinite(count)) {
    throw new ApiError(
      STATUS_CODES.SERVICE_UNAVAILABLE,
      "Unable to check image limit"
    );
  }

  if (count === -1) {
    return {
      allowed: false,
      remaining: 0,
    };
  }

  return {
    allowed: true,
    remaining: DAILY_LIMIT - count,
  };
}

// Restore one quota slot if processing
// could not even be queued.
async function restoreDailyLimit(
  identifier: string
): Promise<void> {
  const key =
    `daily_image_limit:${identifier}`;

  const script = `
    local count = tonumber(redis.call("GET", KEYS[1]) or "0")

    if count > 0 then
      return redis.call("DECR", KEYS[1])
    end

    return 0
  `;

  await redis.eval(script, 1, key);
}

function getUploadedFile(
  req: ImageRequest
): Express.Multer.File {
  if (!req.file) {
    throw new ApiError(
      STATUS_CODES.BAD_REQUEST,
      "Please upload an image file"
    );
  }

  if (
    !req.file.buffer ||
    req.file.size <= 0
  ) {
    throw new ApiError(
      STATUS_CODES.BAD_REQUEST,
      "Uploaded image is empty or invalid"
    );
  }

  return req.file;
}

function getJobIdParam(
  req: Request
): string {
  const raw = req.params.jobId;

  const jobId =
    Array.isArray(raw)
      ? raw[0]
      : raw;

  if (
    typeof jobId !== "string" ||
    !jobId.trim() ||
    jobId.length > 128
  ) {
    throw new ApiError(
      STATUS_CODES.BAD_REQUEST,
      "Invalid job ID"
    );
  }

  return jobId;
}

// =====================================
// Shared Queue Logic
// =====================================

async function queueImageProcessing(
  req: ImageRequest,
  res: Response,
  config: {
    mode: "exact" | "fit";
    folder: string;
    queueName: string;
    responseMessage: string;
    includeCompressionOptions: boolean;
  }
) {
  const file = getUploadedFile(req);

  const userId =
    getAuthenticatedUserId(req);

  const identifier =
    getClientIdentifier(req, userId);

  const body =
    req.body ?? {};

  const width = parseOptionalDimension(
    body.width,
    "Width"
  );

  const height = parseOptionalDimension(
    body.height,
    "Height"
  );

  const quality =
    parseQuality(body.quality);

  const format =
    parseFormat(body.format);

  const preserveResolution =
    config.includeCompressionOptions
      ? parsePreserveResolution(
          body.preserveResolution
        )
      : undefined;

  const maxSizeBytes =
    config.includeCompressionOptions
      ? parseTargetSize(
          body.targetFileSizeKB,
          body.targetFileSizeMB
        )
      : undefined;

  const limitCheck =
    await checkAndIncrementDailyLimit(
      identifier
    );

  if (!limitCheck.allowed) {
    throw new ApiError(
      STATUS_CODES.TOO_MANY_REQUESTS,
      "You have reached your daily limit of 15 images. Please try again after 24 hours."
    );
  }

  let uploadedFileId:
    | string
    | undefined;

  let createdDbJobId:
    | string
    | undefined;

  let queueAdded = false;

  try {
    const uploadResult =
      await uploadToImageKit(
        file.buffer,
        file.originalname,
        config.folder
      );

    uploadedFileId =
      uploadResult.fileId;

    const dbJob = await Job.create({
      ...(userId ? { userId } : {}),
      status: "pending",
      progress: 0,

      inputFiles: [
        {
          fileId: uploadResult.fileId,
          url: uploadResult.url,
          fileName: file.originalname,
          fileSize: file.size,
        },
      ],

      options: {
        mode: config.mode,
        width,
        height,
        outputFormat: format,
        quality,
        maintainAspectRatio: true,
      },
    });

    createdDbJobId =
      dbJob._id.toString();

    const bullJob =
      await resizeQueue.add(
        config.queueName,
        {
          dbJobId:
            createdDbJobId,

          userId: identifier,

          fileId:
            uploadResult.fileId,

          fileUrl:
            uploadResult.url,

          originalFileName:
            file.originalname,

          originalSize:
            file.size,

          transformations: {
            width,
            height,
            quality,
            format,

            ...(config.includeCompressionOptions
              ? {
                  maxSizeBytes,
                  preserveResolution,
                }
              : {}),
          },
        },
        {
          // Keep queue ID identical
          // to MongoDB Job ID.
          jobId: createdDbJobId,
        }
      );

    queueAdded = true;

    return res
      .status(STATUS_CODES.CREATED)
      .json({
        success: true,
        message:
          config.responseMessage,

        jobId: bullJob.id,

        dbJobId: dbJob._id,

        remainingImagesToday:
          limitCheck.remaining,
      });
  } catch (error) {
    if (!queueAdded) {
      // Best-effort cleanup.
      // Cleanup errors should not replace
      // the original error.

      if (createdDbJobId) {
        try {
          await Job.findByIdAndDelete(
            createdDbJobId
          );
        } catch {
          // Log using your Pino logger
          // if cleanup monitoring is needed.
        }
      }

      if (uploadedFileId) {
        try {
          await deleteFromImageKit(
            uploadedFileId
          );
        } catch {
          // Best-effort cleanup.
        }
      }

      try {
        await restoreDailyLimit(
          identifier
        );
      } catch {
        // Best-effort quota restoration.
      }
    }

    throw error;
  }
}

// =====================================
// POST /api/v1/images/resize
// =====================================

export const resizeImage = asyncHandler(
  async (
    req: ImageRequest,
    res: Response
  ) => {
    return queueImageProcessing(
      req,
      res,
      {
        mode: "exact",
        folder: "/meettools/resizes",
        queueName:
          "meettools-resize-job",
        responseMessage:
          "Image compression/resizing request queued successfully",
        includeCompressionOptions: true,
      }
    );
  }
);

// =====================================
// POST /api/v1/images/upload
// =====================================

export const uploadAndResizeImage =
  asyncHandler(
    async (
      req: ImageRequest,
      res: Response
    ) => {
      return queueImageProcessing(
        req,
        res,
        {
          mode: "fit",
          folder: "/meettools/uploads",
          queueName: "resize-image",
          responseMessage:
            "Image uploaded successfully and queued for resizing",
          includeCompressionOptions: false,
        }
      );
    }
  );

// =====================================
// GET /api/v1/images/status/:jobId
// =====================================

export const getJobResultStatus =
  asyncHandler(
    async (
      req: ImageRequest,
      res: Response
    ) => {
      const jobId =
        getJobIdParam(req);

      const job =
        await resizeQueue.getJob(
          jobId
        );

      if (!job) {
        throw new ApiError(
          STATUS_CODES.NOT_FOUND,
          "Job not found or expired"
        );
      }

      const state =
        await job.getState();

      if (state === "failed") {
        return res
          .status(STATUS_CODES.OK)
          .json({
            success: false,
            status: "failed",
            message:
              "Image processing failed in background worker",
            failedReason:
              job.failedReason || null,
          });
      }

      if (state !== "completed") {
        return res
          .status(STATUS_CODES.OK)
          .json({
            success: true,
            status: "processing",
            message:
              "Image is still processing in background...",
          });
      }

      const result =
        job.returnvalue;

      return res
        .status(STATUS_CODES.OK)
        .json({
          success: true,
          status: "completed",
          message:
            "Image processed successfully and details saved to database",

          previewUrl:
            result?.url,

          downloadUrl:
            result?.url,

          fileDetails: {
            fileId:
              result?.fileId,
            fileName:
              result?.fileName,
            fileSize:
              result?.fileSize,
            width:
              result?.width,
            height:
              result?.height,
          },
        });
    }
  );
