import {
  Worker,
  type Job as BullJob,
} from "bullmq";

import { imagekit } from "../config/imagekit.js";
import { redis } from "../config/redis.js";
import { Job } from "../models/Job.model.js";
import { logger } from "../utils/logger.js";

// Types
interface ImageTransformations {
  width?: number | string;
  height?: number | string;
  quality?: number | string;
  format?: string;
  maintainAspectRatio?: boolean;
  maxSizeBytes?: number;
  preserveResolution?: boolean;
}

interface ImageJobData {
  dbJobId: string;
  userId: string;
  fileId?: string;
  fileUrl: string;
  originalFileName?: string;
  originalSize?: number;
  transformations?: ImageTransformations;
}

interface ImageJobResult {
  success: boolean;
  url: string;
  fileId?: string;
  fileName?: string;
  fileSize?: number;
  width?: number;
  height?: number;
}

interface ImageKitTransformation {
  width?: string;
  height?: string;
  quality?: string;
  format?: string;
  crop?: string;
}

interface ProcessedImage {
  url: string;
  fileSize: number;
  width?: number;
  height?: number;
}

// Validate dimensions and quality
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

// Build ImageKit transformations
function buildTransformations(
  transformations?: ImageTransformations,
  qualityOverride?: number,
  widthOverride?: number,
  heightOverride?: number
): ImageKitTransformation[] {
  if (!transformations) {
    return [];
  }

  const result: ImageKitTransformation[] = [];

  const width = validatePositiveInteger(
    widthOverride ?? transformations.width,
    "width",
    10000
  );

  const height = validatePositiveInteger(
    heightOverride ?? transformations.height,
    "height",
    10000
  );

  const quality = validatePositiveInteger(
    qualityOverride ?? transformations.quality,
    "quality",
    100
  );

  if (width) result.push({ width });
  if (height) result.push({ height });
  if (quality) result.push({ quality });

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
      "auto",
    ];

    if (!allowedFormats.includes(normalizedFormat)) {
      throw new Error(
        `Unsupported image format: ${requestedFormat}`
      );
    }

    result.push({
      format: normalizedFormat,
    });
  }

  // Preserve the complete image without cropping.
  if (transformations.maintainAspectRatio !== false) {
    result.push({
      crop: "at_max",
    });
  }

  return result;
}

// Validate incoming job
function validateImageJob(
  data: ImageJobData
): void {
  if (
    !data ||
    typeof data.dbJobId !== "string" ||
    !data.dbJobId.trim()
  ) {
    throw new Error("Missing or invalid dbJobId.");
  }

  if (
    typeof data.fileUrl !== "string" ||
    !data.fileUrl.trim()
  ) {
    throw new Error("Missing or invalid fileUrl.");
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(data.fileUrl);
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

// Get actual transformed image size
async function getImageSize(url: string): Promise<number> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `ImageKit transformation failed: ${response.status}`
    );
  }

  const buffer = await response.arrayBuffer();

  return buffer.byteLength;
}

// Generate transformed URL and measure its actual size
async function createProcessedImage(
  fileUrl: string,
  transformations: ImageTransformations
): Promise<ProcessedImage> {
  const targetSize = transformations.maxSizeBytes;

  const originalWidth = Number(transformations.width);
  const originalHeight = Number(transformations.height);

  let width = originalWidth || undefined;
  let height = originalHeight || undefined;

  let quality = Math.min(
    Math.max(Number(transformations.quality) || 90, 10),
    100
  );

  const targetEnabled =
    typeof targetSize === "number" &&
    Number.isFinite(targetSize) &&
    targetSize > 0;

  const maxAttempts = targetEnabled ? 20 : 1;

  let finalUrl = fileUrl;
  let finalSize = 0;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const transformArray = buildTransformations(
      transformations,
      quality,
      width,
      height
    );

    finalUrl =
      transformArray.length > 0
        ? imagekit.url({
            src: fileUrl,
            transformation: transformArray,
          })
        : fileUrl;

    finalSize = await getImageSize(finalUrl);

    if (!targetEnabled || finalSize <= targetSize!) {
      break;
    }

    if (quality > 10) {
      quality = Math.max(10, quality - 10);
      continue;
    }

    // Reduce dimensions proportionally when quality
    // adjustment alone cannot reach the target size.
    if (
      transformations.preserveResolution === true
    ) {
      throw new Error(
        "Target file size cannot be reached without reducing image resolution."
      );
    }

    if (width && height) {
      const scale = Math.sqrt(
        targetSize! / finalSize
      ) * 0.95;

      width = Math.max(
        1,
        Math.floor(width * scale)
      );

      height = Math.max(
        1,
        Math.floor(height * scale)
      );
    } else if (width) {
      width = Math.max(
        1,
        Math.floor(
          width * Math.sqrt(targetSize! / finalSize) * 0.95
        )
      );
    } else if (height) {
      height = Math.max(
        1,
        Math.floor(
          height * Math.sqrt(targetSize! / finalSize) * 0.95
        )
      );
    } else {
      throw new Error(
        "Target file size requires image dimensions."
      );
    }

    quality = 10;
  }

  if (targetEnabled && finalSize > targetSize!) {
    throw new Error(
      "Unable to reach the requested target file size."
    );
  }

  return {
    url: finalUrl,
    fileSize: finalSize,
    ...(width !== undefined ? { width } : {}),
    ...(height !== undefined ? { height } : {}),
  };
}

// Process image job
const processImageJob = async (
  job: BullJob<ImageJobData, ImageJobResult>
): Promise<ImageJobResult> => {
  const {
    dbJobId,
    userId,
    fileId,
    fileUrl,
    originalFileName,
    transformations,
  } = job.data;

  logger.info(
    `Processing MeetTools image job ${job.id} for ${userId}`
  );

  try {
    validateImageJob(job.data);

    const dbJob = await Job.findById(dbJobId);

    if (!dbJob) {
      throw new Error(
        `Database job not found: ${dbJobId}`
      );
    }

    await Job.findByIdAndUpdate(dbJobId, {
      $set: {
        status: "processing",
        progress: 10,
      },
    });

    await job.updateProgress(20);

    const processedImage = await createProcessedImage(
      fileUrl,
      transformations || {}
    );

    await job.updateProgress(80);

    const result: ImageJobResult = {
      success: true,
      url: processedImage.url,
      fileId,
      fileName: originalFileName || "resized-image",
      fileSize: processedImage.fileSize,
      ...(processedImage.width !== undefined
        ? { width: processedImage.width }
        : {}),
      ...(processedImage.height !== undefined
        ? { height: processedImage.height }
        : {}),
    };

    await Job.findByIdAndUpdate(dbJobId, {
      $set: {
        status: "completed",
        progress: 100,
        outputFiles: [
          {
            fileId: fileId || "",
            url: processedImage.url,
            fileName: result.fileName,
            fileSize: processedImage.fileSize,
            ...(result.width !== undefined
              ? { width: result.width }
              : {}),
            ...(result.height !== undefined
              ? { height: result.height }
              : {}),
          },
        ],
      },
    });

    await job.updateProgress(100);

    logger.info(
      `MeetTools image job ${job.id} saved successfully to MongoDB`
    );

    return result;
  } catch (error: unknown) {
    try {
      if (dbJobId) {
        await Job.findByIdAndUpdate(dbJobId, {
          $set: {
            status: "failed",
          },
        });
      }
    } catch (databaseError) {
      logger.error(
        {
          err: databaseError,
          dbJobId,
        },
        "Failed to update database job status"
      );
    }

    logger.error(
      {
        err: error,
        jobId: job.id,
        dbJobId,
        userId,
      },
      "Failed to process MeetTools image job"
    );

    throw error;
  }
};

// Initialize Worker
export const imageWorker = new Worker<
  ImageJobData,
  ImageJobResult
>(
  "meettools-resize-job",
  processImageJob,
  {
    connection: redis,
    concurrency: 5,
  }
);

// Worker events
imageWorker.on("ready", () => {
  logger.info(
    "MeetTools Image Worker connected to Redis."
  );
});

imageWorker.on("completed", (job) => {
  logger.info(
    `MeetTools BullMQ Image Job ${job.id} completed successfully.`
  );
});

imageWorker.on("failed", (job, error) => {
  logger.error(
    {
      err: error,
      jobId: job?.id ?? "unknown",
    },
    "MeetTools BullMQ Image Job failed"
  );
});

imageWorker.on("error", (error) => {
  logger.error(
    { err: error },
    "MeetTools Image Worker error"
  );
});

// Graceful shutdown
export async function closeImageWorker(): Promise<void> {
  logger.info("Closing MeetTools Image Worker...");

  await imageWorker.close();

  logger.info(
    "MeetTools Image Worker closed successfully."
  );
}

logger.info(
  "MeetTools Image Worker initialized and waiting for jobs..."
);