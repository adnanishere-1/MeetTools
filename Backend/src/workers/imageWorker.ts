
import {
  Worker,
  type Job as BullJob,
} from "bullmq";

import { imagekit } from "../config/imagekit.js";
import { redis } from "../config/redis.js";
import { logger } from "../utils/logger.js";

// =====================================
// Types
// =====================================

interface ImageTransformations {
  width?: number | string;
  height?: number | string;
  quality?: number | string;
  format?: string;
}

interface ImageJobData {
  userId: string;
  fileId?: string;
  fileUrl: string;
  transformations?: ImageTransformations;
}

interface ImageJobResult {
  success: boolean;
  url: string;
  fileId?: string;
}

interface ImageKitTransformation {
  width?: string;
  height?: string;
  quality?: string;
  format?: string;
}

// =====================================
// Validation Helpers
// =====================================

function validatePositiveInteger(
  value: number | string | undefined,
  fieldName: string,
  maximum: number
): string | undefined {
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
    parsed > maximum
  ) {
    throw new Error(
      `Invalid ${fieldName}. Expected a value between 1 and ${maximum}.`
    );
  }

  return String(parsed);
}

function buildTransformations(
  transformations?: ImageTransformations
): ImageKitTransformation[] {
  if (!transformations) {
    return [];
  }

  const result: ImageKitTransformation[] = [];

  const width = validatePositiveInteger(
    transformations.width,
    "width",
    10000
  );

  const height = validatePositiveInteger(
    transformations.height,
    "height",
    10000
  );

  const quality = validatePositiveInteger(
    transformations.quality,
    "quality",
    100
  );

  if (width) {
    result.push({ width });
  }

  if (height) {
    result.push({ height });
  }

  if (quality) {
    result.push({ quality });
  }

  if (transformations.format) {
    const requestedFormat =
      transformations.format
        .trim()
        .toLowerCase();

    const normalizedFormat =
      requestedFormat === "jpg"
        ? "jpeg"
        : requestedFormat;

    const allowedFormats = [
      "jpeg",
      "png",
      "webp",
      "avif",
      "auto",
    ];

    if (
      !allowedFormats.includes(normalizedFormat)
    ) {
      throw new Error(
        `Unsupported image format: ${requestedFormat}`
      );
    }

    result.push({
      format: normalizedFormat,
    });
  }

  return result;
}

function validateImageJob(
  data: ImageJobData
): void {
  if (
    !data ||
    typeof data.userId !== "string" ||
    !data.userId.trim()
  ) {
    throw new Error(
      "Missing or invalid userId."
    );
  }

  if (
    typeof data.fileUrl !== "string" ||
    !data.fileUrl.trim()
  ) {
    throw new Error(
      "Missing or invalid fileUrl."
    );
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(data.fileUrl);
  } catch {
    throw new Error(
      "Invalid source image URL."
    );
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
// Process Image Job
// =====================================

const processImageJob = async (
  job: BullJob<ImageJobData, ImageJobResult>
): Promise<ImageJobResult> => {
  const {
    userId,
    fileId,
    fileUrl,
    transformations,
  } = job.data;

  logger.info(
    `⚙️ Processing image job ${job.id} for user/IP: ${userId}`
  );

  try {
    // Step 1: Validate job data.
    validateImageJob(job.data);

    await job.updateProgress(20);

    // Step 2: Build ImageKit transformations.
    const transformArray =
      buildTransformations(transformations);

    await job.updateProgress(50);

    // Step 3: Generate transformed image URL.
    let finalOutputUrl = fileUrl;

    if (transformArray.length > 0) {
      finalOutputUrl = imagekit.url({
        src: fileUrl,
        transformation: transformArray,
      });
    }

    await job.updateProgress(80);

    // Original ImageKit file is preserved.
    // The returned URL can be used by the
    // controller for preview and download.

    const result: ImageJobResult = {
      success: true,
      url: finalOutputUrl,
      fileId,
    };

    await job.updateProgress(100);

    logger.info(
      `✅ Image job ${job.id} processed successfully`
    );

    return result;
  } catch (error: unknown) {
    logger.error(
      {
        err: error,
        jobId: job.id,
        userId,
      },
      "❌ Failed to process image job"
    );

    throw error;
  }
};

// =====================================
// Initialize Worker
// =====================================

export const imageWorker = new Worker<
  ImageJobData,
  ImageJobResult
>(
  "meettools-image-queue",
  processImageJob,
  {
    // Reuse your existing Redis connection.
    connection: redis,

    concurrency: 5,
  }
);

// =====================================
// Worker Events
// =====================================

imageWorker.on("ready", () => {
  logger.info(
    "✅ MeetTools Image Worker connected to Redis."
  );
});

imageWorker.on("completed", (job) => {
  logger.info(
    `🎉 BullMQ Image Job ${job.id} completed successfully.`
  );
});

imageWorker.on("failed", (job, error) => {
  logger.error(
    {
      err: error,
      jobId: job?.id ?? "unknown",
    },
    "❌ BullMQ Image Job failed"
  );
});

imageWorker.on("error", (error) => {
  logger.error(
    {
      err: error,
    },
    "❌ MeetTools Image Worker error"
  );
});

// =====================================
// Graceful Shutdown
// =====================================

export async function closeImageWorker():
  Promise<void> {
  logger.info(
    "🛑 Closing MeetTools Image Worker..."
  );

  await imageWorker.close();

  logger.info(
    "✅ MeetTools Image Worker closed successfully."
  );
}

logger.info(
  "🚀 MeetTools Image Worker initialized and waiting for jobs..."
);
