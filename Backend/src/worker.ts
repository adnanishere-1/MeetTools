
import "dotenv/config";

import {
  Worker,
  type Job as BullJob,
} from "bullmq";

import { imagekit } from "./config/imagekit.js";
import { redisConnectionOptions } from "./config/redis.js";
import { logger } from "./utils/logger.js";

// =====================================
// Types
// =====================================

interface ResizeTransformations {
  width?: number | string;
  height?: number | string;
  quality?: number | string;
  format?: string;
}

interface ResizeJobData {
  userId: string;
  fileId?: string;
  fileUrl: string;
  transformations?: ResizeTransformations;
  originalFileName?: string;
  originalSize?: number;
}

interface ImageKitTransformation {
  width?: string;
  height?: string;
  quality?: string;
  format?: string;
}

// =====================================
// Transformation Helpers
// =====================================

function validatePositiveInteger(
  value: number | string | undefined,
  fieldName: string,
  maxValue: number
): string | undefined {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return undefined;
  }

  const numberValue = Number(value);

  if (
    !Number.isInteger(numberValue) ||
    numberValue < 1 ||
    numberValue > maxValue
  ) {
    throw new Error(
      `Invalid ${fieldName}. Must be between 1 and ${maxValue}.`
    );
  }

  return String(numberValue);
}

function buildTransformations(
  transformations?: ResizeTransformations
): ImageKitTransformation[] {
  if (!transformations) {
    return [];
  }

  const transformArray: ImageKitTransformation[] = [];

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
    transformArray.push({ width });
  }

  if (height) {
    transformArray.push({ height });
  }

  if (quality) {
    transformArray.push({ quality });
  }

  if (transformations.format) {
    const requestedFormat =
      transformations.format.trim().toLowerCase();

    const normalizedFormat =
      requestedFormat === "jpg"
        ? "jpeg"
        : requestedFormat;

    const allowedFormats = [
      "jpeg",
      "png",
      "webp",
      "avif",
    ];

    if (!allowedFormats.includes(normalizedFormat)) {
      throw new Error(
        `Unsupported image format: ${requestedFormat}`
      );
    }

    transformArray.push({
      format: normalizedFormat,
    });
  }

  return transformArray;
}

// =====================================
// Background Worker
// =====================================

async function startWorker(): Promise<void> {
  logger.info(
    "🚀 MeetTools Background Worker is starting..."
  );

  const worker = new Worker<ResizeJobData>(
    "meetools-resize-queue",

    async (bullJob: BullJob<ResizeJobData>) => {
      const {
        userId,
        fileId,
        fileUrl,
        transformations,
        originalFileName,
        originalSize,
      } = bullJob.data;

      logger.info(
        `⚙️ Processing job ID: ${bullJob.id} for user: ${userId}`
      );

      try {
        if (!userId) {
          throw new Error(
            "Missing userId in resize job."
          );
        }

        if (!fileUrl) {
          throw new Error(
            "Missing fileUrl in resize job."
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
          parsedUrl.protocol !== "http:" &&
          parsedUrl.protocol !== "https:"
        ) {
          throw new Error(
            "Only HTTP/HTTPS image URLs are supported."
          );
        }

        await bullJob.updateProgress(20);

        const transformArray =
          buildTransformations(transformations);

        await bullJob.updateProgress(40);

        let finalOutputUrl = fileUrl;

        if (transformArray.length > 0) {
          finalOutputUrl = imagekit.url({
            src: fileUrl,
            transformation: transformArray,
          });
        }

        await bullJob.updateProgress(70);

        const requestedWidth =
          transformations?.width !== undefined
            ? Number(transformations.width)
            : undefined;

        const requestedHeight =
          transformations?.height !== undefined
            ? Number(transformations.height)
            : undefined;

        const result = {
          success: true,

          fileId:
            fileId ||
            `resized_${bullJob.id ?? Date.now()}`,

          url: finalOutputUrl,
          downloadUrl: finalOutputUrl,

          fileName:
            originalFileName ||
            "processed-image.webp",

          fileSize:
            typeof originalSize === "number" &&
            Number.isFinite(originalSize) &&
            originalSize >= 0
              ? originalSize
              : 0,

          width: requestedWidth,
          height: requestedHeight,
        };

        await bullJob.updateProgress(100);

        logger.info(
          `✅ Successfully completed job ID: ${bullJob.id}`
        );

        return result;
      } catch (error: unknown) {
        logger.error(
          `❌ Error processing job ${bullJob.id}: ${
            error instanceof Error
              ? error.message
              : String(error)
          }`
        );

        throw error;
      }
    },

    {
      connection: {
        ...redisConnectionOptions,
      } as import("bullmq").WorkerOptions["connection"],
      concurrency: 2,
    }
  );

  // =====================================
  // Worker Events
  // =====================================

  worker.on("ready", () => {
    logger.info(
      "✅ MeetTools Worker connected to Redis."
    );
  });

  worker.on("completed", (job) => {
    logger.info(
      `🎉 BullMQ Job completed: ${job.id}`
    );
  });

  worker.on("failed", (job, error) => {
    logger.error(
      `❌ BullMQ Job failed: ${
        job?.id ?? "unknown"
      } - ${error.message}`
    );
  });

  worker.on("error", (error) => {
    logger.error(
      { err: error },
      "❌ BullMQ Worker error:"
    );
  });

  // =====================================
  // Graceful Shutdown
  // =====================================

  let shuttingDown = false;

  const shutdown = async (signal: string) => {
    if (shuttingDown) return;

    shuttingDown = true;

    logger.info(
      `🛑 Received ${signal}. Closing worker...`
    );

    try {
      await worker.close();

      logger.info(
        "✅ MeetTools Worker closed successfully."
      );

      process.exitCode = 0;
    } catch (error: unknown) {
      logger.error(
        { err: error },
        "❌ Error while closing worker:"
      );

      process.exitCode = 1;
    }
  };

  process.once("SIGINT", () => {
    void shutdown("SIGINT");
  });

  process.once("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
}

// =====================================
// Start Worker
// =====================================

startWorker().catch((error: unknown) => {
  logger.error(
    { err: error },
    "❌ Worker failed to start:"
  );

  process.exitCode = 1;
});
