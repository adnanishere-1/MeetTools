
import "dotenv/config";

import mongoose from "mongoose";
import { createHash } from "node:crypto";
import IORedis from "ioredis";

import {
  Worker,
  type Job,
} from "bullmq";

import { imagekit } from "../config/imagekit.js";
import { redisConnectionOptions } from "../config/redis.js";
import { logger } from "../utils/logger.js";
import { ActivityLog } from "../models/ActivityLog.model.js";

// =====================================
// Types
// =====================================

interface ResizeTransformations {
  width?: number | string | null;
  height?: number | string | null;
  quality?: number | string | null;
  format?: string;
}

interface ResizeJobData {
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
  cropMode?: "maintain_ratio";
  focus?: "auto";
  quality?: string;
  format?: string;
  effectSharpen?: string;
};

// =====================================
// MongoDB Connection For Activity Logs
// =====================================

let mongoConnectionPromise:
  Promise<typeof mongoose> | null = null;

async function ensureMongoConnection():
  Promise<void> {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  if (mongoose.connection.readyState === 2) {
    await mongoose.connection.asPromise();
    return;
  }

  if (!mongoConnectionPromise) {
    const mongoUri =
      process.env.MONGODB_URI ||
      process.env.MONGO_URI;

    if (!mongoUri) {
      throw new Error(
        "MONGODB_URI or MONGO_URI is required for worker activity logging."
      );
    }

    mongoConnectionPromise = mongoose.connect(
      mongoUri
    );
  }

  try {
    await mongoConnectionPromise;
  } catch (error) {
    mongoConnectionPromise = null;
    throw error;
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

function validateSourceUrl(
  fileUrl: string
): void {
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
        ? new mongoose.Types.ObjectId(
            authenticatedUserId
          )
        : null;

    const activityId = new mongoose.Types.ObjectId(
      createHash("sha256")
        .update(
          `meetools:image-resize:${job.queueName}:${job.id}`
        )
        .digest()
        .subarray(0, 12)
    );

    const result = await ActivityLog.updateOne(
      {
        _id: activityId,
      },
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
            visitorType: userId
              ? "user"
              : "guest",
          },
        },
      },
      {
        upsert: true,
      }
    );

    if (result.upsertedCount > 0) {
      logger.info(
        `📊 Tool usage recorded: Image Resize (${userId ? "Logged-in" : "Guest"})`
      );
    }
  } catch (error: unknown) {
    logger.error(
      {
        err: error,
        jobId: job.id,
      },
      "❌ Failed to record tool usage"
    );
  }
}

// =====================================
// Process Resize Job
// =====================================

const processResizeJob = async (
  job: Job<ResizeJobData, ResizeJobResult>
): Promise<ResizeJobResult> => {
  const {
    fileId,
    fileUrl,
    originalFileName,
    originalSize,
    transformations,
  } = job.data;

  logger.info(
    `📐 Resize Job ${job.id} started`
  );

  try {
    validateSourceUrl(fileUrl);

    await job.updateProgress(20);

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
      transformations?.format
        ?.trim()
        .toLowerCase() || "webp";

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

    await job.updateProgress(40);

    const transformation: ImageKitTransformation[] = [];

    if (width !== null || height !== null) {
      const dimensionTransformation:
        ImageKitTransformation = {
          cropMode: "maintain_ratio",
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
      quality: String(quality ?? 90),
      format,
      effectSharpen: "10",
    });

    await job.updateProgress(60);

    const resizedUrl = imagekit.url({
      src: fileUrl,
      transformation,
    });

    await job.updateProgress(80);

    const result: ResizeJobResult = {
      success: true,
      fileId,
      url: resizedUrl,
      fileName:
        originalFileName ||
        "processed-image.webp",
      fileSize:
        typeof originalSize === "number" &&
        Number.isFinite(originalSize) &&
        originalSize >= 0
          ? originalSize
          : 0,
      width,
      height,
    };

    await recordToolUsage(job, {
      width,
      height,
      format,
    });

    await job.updateProgress(100);

    logger.info(
      `✅ Resize Job ${job.id} finished successfully`
    );

    return result;
  } catch (error: unknown) {
    logger.error(
      {
        err: error,
        jobId: job.id,
      },
      "❌ Resize Job failed"
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
  "meetools-resize-queue",
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
  logger.info(
    "✅ MeetTools Resize Worker connected to Redis."
  );
});

resizeWorker.on("completed", (job) => {
  logger.info(
    `🏁 Resize Job ${job.id} completed`
  );
});

resizeWorker.on("failed", (job, error) => {
  logger.error(
    {
      err: error,
      jobId: job?.id ?? "unknown",
    },
    "💥 Resize Job failed"
  );
});

resizeWorker.on("error", (error) => {
  logger.error(
    {
      err: error,
    },
    "❌ Resize Worker error"
  );
});

// =====================================
// Graceful Shutdown
// =====================================

export async function closeResizeWorker():
  Promise<void> {
  logger.info(
    "🛑 Closing MeetTools Resize Worker..."
  );

  await resizeWorker.close();

  logger.info(
    "✅ MeetTools Resize Worker closed successfully."
  );
}

logger.info(
  "🚀 MeetTools Resize Worker initialized."
);
