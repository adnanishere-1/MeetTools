import "dotenv/config";

import mongoose from "mongoose";
import { createHash } from "node:crypto";
import IORedis from "ioredis";

import {
  Worker,
  UnrecoverableError,
  type Job,
} from "bullmq";

import { imagekit } from "../config/imagekit.js";
import {
  redis,
  redisConnectionOptions,
} from "../config/redis.js";
import { logger } from "../utils/logger.js";
import { ActivityLog } from "../models/ActivityLog.model.js";
import { Job as DatabaseJob } from "../models/Job.model.js";

// =====================================
// Types
// =====================================

interface ResizeTransformations {
  width?: number | string | null;
  height?: number | string | null;
  quality?: number | string | null;
  format?: string;
  maintainAspectRatio?: boolean;
  maxSizeBytes?: number;
  preserveResolution?: boolean;
}

interface ResizeJobData {
  dbJobId?: string;
  userId?: string;
  fileId?: string;
  fileUrl: string;
  originalFileName?: string;
  originalSize?: number;
  transformations?: ResizeTransformations;
}

interface ResizeJobResult {
  success: boolean;
  fileId?: string;
  url: string;
  fileName: string;
  fileSize: number;
  width: number | null;
  height: number | null;
}

type ImageKitTransformation = {
  width?: string;
  height?: string;
  cropMode?: "maintain_ratio" | "force";
  focus?: "auto";
  quality?: string;
  format?: string;
};

// =====================================
// Get Actual Transformed Image Size
// =====================================

async function getTransformedFileSize(
  url: string
): Promise<number> {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      logger.warn(
        `Could not calculate transformed image size. Status: ${response.status}`
      );

      return 0;
    }

    const buffer = await response.arrayBuffer();

    return buffer.byteLength;
  } catch (error) {
    logger.warn(
      { err: error },
      "Could not calculate transformed image size. Resize will continue."
    );

    return 0;
  }
}

// =====================================
// Job Cancellation Helper
// =====================================

async function checkJobCancellation(
  jobId: string | undefined
): Promise<void> {
  if (!jobId) return;

  const cancellationKey = `meetools:cancel-resize:${jobId}`;
  const cancelled = await redis.get(cancellationKey);

  if (cancelled === "1") {
    throw new UnrecoverableError(
      "JOB_CANCELLED: Job cancelled by user"
    );
  }
}

// =====================================
// MongoDB Connection For Activity Logs
// =====================================

let mongoConnectionPromise: Promise<typeof mongoose> | null = null;

async function ensureMongoConnection(): Promise<void> {
  if (mongoose.connection.readyState === 1) return;

  if (mongoose.connection.readyState === 2) {
    await mongoose.connection.asPromise();
    return;
  }

  if (!mongoConnectionPromise) {
    const mongoUri =
      process.env.MONGODB_URI || process.env.MONGO_URI;

    if (!mongoUri) {
      throw new Error(
        "MONGODB_URI or MONGO_URI is required for worker activity logging."
      );
    }

    mongoConnectionPromise = mongoose.connect(mongoUri);
  }

  try {
    await mongoConnectionPromise;
  } catch (error) {
    mongoConnectionPromise = null;
    throw error;
  }
}

// =====================================
// MongoDB Job Status Helpers
// =====================================

async function updateDatabaseJob(
  dbJobId: string | undefined,
  update: Record<string, unknown>
): Promise<void> {
  if (!dbJobId) {
    logger.warn(
      "MongoDB job ID missing. Job status was not updated."
    );
    return;
  }

  await ensureMongoConnection();

  const updatedJob = await DatabaseJob.findByIdAndUpdate(
    dbJobId,
    update,
    { new: true }
  );

  if (!updatedJob) {
    throw new Error(`MongoDB job not found: ${dbJobId}`);
  }
}

// =====================================
// Validation Helpers
// =====================================

function validateInteger(
  value: number | string | null | undefined,
  field: string,
  max: number
): number | null {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const parsed = Number(value);

  if (
    !Number.isInteger(parsed) ||
    parsed < 1 ||
    parsed > max
  ) {
    throw new Error(
      `Invalid ${field}. Must be between 1 and ${max}.`
    );
  }

  return parsed;
}

function validateSourceUrl(fileUrl: string): void {
  if (
    typeof fileUrl !== "string" ||
    !fileUrl.trim()
  ) {
    throw new Error("Missing source image URL.");
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(fileUrl);
  } catch {
    throw new Error("Invalid source image URL.");
  }

  if (
    parsedUrl.protocol !== "https:" &&
    parsedUrl.protocol !== "http:"
  ) {
    throw new Error(
      "Source image URL must use HTTP or HTTPS."
    );
  }
}

function validateBoolean(
  value: unknown,
  defaultValue: boolean
): boolean {
  if (value === undefined || value === null) {
    return defaultValue;
  }

  return value === true || value === "true";
}

function validateMaxSize(
  value: unknown
): number | null {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const parsed = Number(value);

  if (
    !Number.isInteger(parsed) ||
    parsed < 1 ||
    parsed > 100 * 1024 * 1024
  ) {
    throw new Error(
      "Target file size must be between 1 byte and 100 MB."
    );
  }

  return parsed;
}

// =====================================
// Save Successful Tool Usage
// =====================================

async function recordToolUsage(
  job: Job<ResizeJobData, ResizeJobResult>,
  details: {
    width: number | null;
    height: number | null;
    format: string;
  }
): Promise<void> {
  try {
    await ensureMongoConnection();

    const identifier = job.data.userId;

    const authenticatedUserId =
      typeof identifier === "string" &&
      identifier.startsWith("user:")
        ? identifier.slice(5)
        : null;

    const userId =
      authenticatedUserId &&
      mongoose.isValidObjectId(authenticatedUserId)
        ? new mongoose.Types.ObjectId(authenticatedUserId)
        : null;

    const activityId = new mongoose.Types.ObjectId(
      createHash("sha256")
        .update(
          `meettools:image-resize:${job.queueName}:${job.id}`
        )
        .digest()
        .subarray(0, 12)
    );

    const result = await ActivityLog.updateOne(
      { _id: activityId },
      {
        $setOnInsert: {
          userId,
          action: "IMAGE_RESIZE",
          details: {
            toolId: "Image Resize",
            jobId: String(job.id),
            queueName: job.name,
            format: details.format,
            width: details.width,
            height: details.height,
            visitorType: userId ? "user" : "guest",
          },
        },
      },
      { upsert: true }
    );

    if (result.upsertedCount > 0) {
      logger.info(
        `Tool usage recorded: Image Resize (${userId ? "Logged-in" : "Guest"})`
      );
    }
  } catch (error: unknown) {
    logger.error(
      { err: error, jobId: job.id },
      "Failed to record tool usage"
    );
  }
}

// =====================================
// Build ImageKit Transformation URL
// =====================================

function buildTransformationUrl(
  fileUrl: string,
  width: number | null,
  height: number | null,
  quality: number,
  format: string,
  maintainAspectRatio: boolean
): string {
  const transformation: ImageKitTransformation[] = [];

  if (width !== null || height !== null) {
    const dimensionTransformation: ImageKitTransformation = {
      cropMode: maintainAspectRatio
        ? "maintain_ratio"
        : "force",
      focus: "auto",
    };

    if (width !== null) {
      dimensionTransformation.width = String(width);
    }

    if (height !== null) {
      dimensionTransformation.height = String(height);
    }

    transformation.push(dimensionTransformation);
  }

  transformation.push({
    quality: String(quality),
    format,
  });

  return imagekit.url({
    src: fileUrl,
    transformation,
  });
}

// =====================================
// Find Best Quality For Target Size (Optimized for Exact Target Match)
// =====================================

async function getBestOutput(
  fileUrl: string,
  width: number | null,
  height: number | null,
  requestedQuality: number,
  format: string,
  maintainAspectRatio: boolean,
  maxSizeBytes: number | null
): Promise<{
  url: string;
  fileSize: number;
  quality: number;
}> {
  // No target size requested: use selected quality.
  if (maxSizeBytes === null) {
    const outputUrl = buildTransformationUrl(
      fileUrl,
      width,
      height,
      requestedQuality,
      format,
      maintainAspectRatio
    );
    const fileSize = await getTransformedFileSize(outputUrl);
    return { url: outputUrl, fileSize, quality: requestedQuality };
  }

  let bestQuality = requestedQuality;
  let bestUrl = "";
  let bestSize = 0;
  let closestValidUrl = "";
  let closestValidSize = 0;
  let closestValidQuality = 0;

  // Check from high quality down to low quality in steps of 2 for fine accuracy
  for (let q = 95; q >= 10; q -= 2) {
    const testUrl = buildTransformationUrl(fileUrl, width, height, q, format, maintainAspectRatio);
    const testSize = await getTransformedFileSize(testUrl);

    if (testSize <= 0) continue;

    bestQuality = q;
    bestUrl = testUrl;
    bestSize = testSize;

    if (testSize <= maxSizeBytes) {
      // Yeh size target ke andard hai, isay save kar lete hain
      closestValidUrl = testUrl;
      closestValidSize = testSize;
      closestValidQuality = q;
      
      // Jaise hi target ke bilkul qareeb ya barabar aaye, loop rok dein taake mazeed chota na ho
      break;
    }
  }

  // Agar koi valid size target ke andar mil gaya hai
  if (closestValidUrl) {
    return { url: closestValidUrl, fileSize: closestValidSize, quality: closestValidQuality };
  }

  // Agar sabhi sizes target se bade hain, toh sabse choti quality wala return kar do
  if (bestUrl) {
    return { url: bestUrl, fileSize: bestSize, quality: bestQuality };
  }

  const fallbackUrl = buildTransformationUrl(fileUrl, width, height, requestedQuality, format, maintainAspectRatio);
  const fallbackSize = await getTransformedFileSize(fallbackUrl);
  return { url: fallbackUrl, fileSize: fallbackSize, quality: requestedQuality };
}

// =====================================
// Process Resize Job
// =====================================

const processResizeJob = async (
  job: Job<ResizeJobData, ResizeJobResult>
): Promise<ResizeJobResult> => {
  const {
    dbJobId,
    fileId,
    fileUrl,
    originalFileName,
    transformations,
  } = job.data;

  logger.info(`Resize Job ${job.id} started`);

  try {
    await updateDatabaseJob(dbJobId, {
      $set: {
        status: "processing",
        progress: 0,
      },
      $unset: { error: 1 },
    });

    await checkJobCancellation(job.id);
    validateSourceUrl(fileUrl);

    await job.updateProgress(20);

    await updateDatabaseJob(dbJobId, {
      $set: { progress: 20 },
    });

    await checkJobCancellation(job.id);

    const width = validateInteger(
      transformations?.width,
      "width",
      10000
    );

    const height = validateInteger(
      transformations?.height,
      "height",
      10000
    );

    const quality = validateInteger(
      transformations?.quality,
      "quality",
      100
    );

    const requestedFormat =
      transformations?.format?.trim().toLowerCase() || "webp";

    const format =
      requestedFormat === "jpg"
        ? "jpeg"
        : requestedFormat;

    const allowedFormats = [
      "jpeg",
      "png",
      "webp",
      "avif",
    ];

    if (!allowedFormats.includes(format)) {
      throw new Error(
        `Unsupported output format: ${requestedFormat}`
      );
    }

    const maintainAspectRatio =
      validateBoolean(
        transformations?.maintainAspectRatio,
        true
      );

    const maxSizeBytes = validateMaxSize(
      transformations?.maxSizeBytes
    );

    await job.updateProgress(40);

    await updateDatabaseJob(dbJobId, {
      $set: { progress: 40 },
    });

    await checkJobCancellation(job.id);

    await job.updateProgress(60);

    await updateDatabaseJob(dbJobId, {
      $set: { progress: 60 },
    });

    await checkJobCancellation(job.id);

    // Generate output and adjust quality if target size is set.
    const output = await getBestOutput(
      fileUrl,
      width,
      height,
      quality ?? 90,
      format,
      maintainAspectRatio,
      maxSizeBytes
    );

    const resizedUrl = output.url;
    const resizedFileSize = output.fileSize;

    await job.updateProgress(80);

    await updateDatabaseJob(dbJobId, {
      $set: { progress: 80 },
    });

    await checkJobCancellation(job.id);

    const result: ResizeJobResult = {
      success: true,
      fileId,
      url: resizedUrl,
      fileName:
        originalFileName || "processed-image.webp",
      fileSize: resizedFileSize,
      width,
      height,
    };

    await checkJobCancellation(job.id);

    await updateDatabaseJob(dbJobId, {
      $set: {
        status: "completed",
        progress: 100,
        completedAt: new Date(),
        outputFiles: [
          {
            fileId: fileId || "",
            url: resizedUrl,
            fileName: result.fileName,
            fileSize: result.fileSize,
            ...(width !== null ? { width } : {}),
            ...(height !== null ? { height } : {}),
          },
        ],
      },
      $unset: { error: 1 },
    });

    await recordToolUsage(job, {
      width,
      height,
      format,
    });

    await job.updateProgress(100);

    logger.info(
      `Resize Job ${job.id} finished successfully. Output size: ${resizedFileSize} bytes`
    );

    return result;
  } catch (error: unknown) {
    logger.error(
      { err: error, jobId: job.id },
      "Resize Job failed"
    );

    throw error;
  }
};

// =====================================
// Initialize Resize Worker
// =====================================

export const resizeWorker = new Worker<
  ResizeJobData,
  ResizeJobResult
>(
  "meettools-resize-queue",
  processResizeJob,
  {
    connection: new IORedis(redisConnectionOptions),
    concurrency: 5,
  }
);

// =====================================
// Worker Events
// =====================================

resizeWorker.on("ready", () => {
  logger.info("MeetTools Resize Worker connected to Redis.");
});

resizeWorker.on("completed", (job) => {
  logger.info(`Resize Job ${job.id} completed`);
});

resizeWorker.on("failed", async (job, error) => {
  logger.error(
    {
      err: error,
      jobId: job?.id ?? "unknown",
    },
    "Resize Job failed"
  );

  if (!job?.data?.dbJobId) return;

  const maxAttempts = Number(job.opts.attempts ?? 1);

  if (job.attemptsMade >= maxAttempts) {
    const isCancelled = error.message.includes(
      "JOB_CANCELLED:"
    );

    try {
      await updateDatabaseJob(job.data.dbJobId, {
        $set: {
          status: "failed",
          error: {
            message: isCancelled
              ? "Job cancelled by user"
              : error.message || "Image processing failed",
            code: isCancelled
              ? "JOB_CANCELLED"
              : "IMAGE_PROCESSING_FAILED",
          },
        },
      });

      if (isCancelled && job.id) {
        await redis.del(
          `meettools:cancel-resize:${job.id}`
        );
      }
    } catch (dbError) {
      logger.error(
        { err: dbError, jobId: job.id },
        "Failed to update MongoDB job status"
      );
    }
  }
});

resizeWorker.on("error", (error) => {
  logger.error(
    { err: error },
    "Resize Worker error"
  );
});

// =====================================
// Graceful Shutdown
// =====================================

export async function closeResizeWorker(): Promise<void> {
  logger.info("Closing MeetTools Resize Worker...");

  await resizeWorker.close();

  logger.info(
    "MeetTools Resize Worker closed successfully."
  );
}

logger.info("MeetTools Resize Worker initialized.");