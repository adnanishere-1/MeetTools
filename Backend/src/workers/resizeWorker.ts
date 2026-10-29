
import "dotenv/config";

import {
  Worker,
  type Job,
} from "bullmq";

import { imagekit } from "../config/imagekit.js";
import { logger } from "../utils/logger.js";

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
// Redis Configuration
// =====================================

const redisPort = Number(
  process.env.REDIS_PORT || 6379
);

if (
  !Number.isInteger(redisPort) ||
  redisPort < 1 ||
  redisPort > 65535
) {
  throw new Error(
    "Invalid REDIS_PORT environment variable."
  );
}

const redisConnection = {
  host: process.env.REDIS_HOST || "localhost",
  port: redisPort,
  password: process.env.REDIS_PASSWORD || undefined,

  // Required for BullMQ Worker connections.
  maxRetriesPerRequest: null,
};

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
    throw new Error(
      "Missing source image URL."
    );
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(fileUrl);
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
    // Step 1: Validate source image.
    validateSourceUrl(fileUrl);

    await job.updateProgress(20);

    // Step 2: Validate transformations.
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

    // Step 3: Build ImageKit transformations.
    const transformation: ImageKitTransformation[] = [];

    // Preserve aspect ratio when resizing.
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

      transformation.push(
        dimensionTransformation
      );
    }

    // Apply quality, format and sharpening.
    transformation.push({
      quality: String(quality ?? 90),
      format,
      effectSharpen: "10",
    });

    await job.updateProgress(60);

    // Step 4: Generate ImageKit resized URL.
    const resizedUrl = imagekit.url({
      src: fileUrl,
      transformation,
    });

    await job.updateProgress(80);

    // Step 5: Return controller-compatible result.
    //
    // Original image is NOT deleted.
    // fileSize is original file size, not
    // measured resized output size.

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
  "meettools-resize-queue",
  processResizeJob,
  {
    connection: redisConnection,
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
