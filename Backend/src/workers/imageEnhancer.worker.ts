
import { Worker, type Job } from "bullmq";
import sharp from "sharp";

import {
  ImageEnhancerJobStatus,
} from "../models/imageEnhancer.model";

import {
  findJobById,
  markJobProcessing,
  markJobCompleted,
  markJobFailed,
  refundDailyQuota,
} from "../models/image-enhancer/imageEnhancer.repository";

import {
  runEnhancementPipeline,
} from "../processors/enhancePipline";

import {
  uploadToImageKit,
  deleteFromImageKit,
} from "../config/imagekit";

import type {
  ImageEnhancerQueuePayload,
} from "../models/image-enhancer/imageEnhancer.types";

// --------------------------------------------------
// Configuration
// --------------------------------------------------

const QUEUE_NAME = "image-enhancer";

const WORKER_CONCURRENCY = 2;

const LOCK_DURATION = 120_000;

const STALLED_INTERVAL = 30_000;

const MAX_IMAGE_PIXELS = 40_000_000;

const MAX_INPUT_SIZE = 10 * 1024 * 1024;

const MAX_OUTPUT_SIZE = 50 * 1024 * 1024;

const IMAGEKIT_OUTPUT_FOLDER =
  "/meettools/image-enhancer/results";

const WORKER_ENABLED =
  process.env.IMAGE_ENHANCER_WORKER_ENABLED !== "false";

// --------------------------------------------------
// Types
// --------------------------------------------------

interface ImageEnhancerWorkerResult {
  jobId: string;
  fileId: string;
  url: string;
  format: string;
  size: number;
  width: number;
  height: number;
  durationMs: number;
}

interface ImageKitImage {
  fileId: string;
  url: string;
}

class ImageEnhancerWorkerError extends Error {
  public readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = "ImageEnhancerWorkerError";
    this.code = code;
  }
}

// --------------------------------------------------
// Helpers
// --------------------------------------------------

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected image processing error occurred.";
}

function getErrorCode(error: unknown): string {
  if (error instanceof ImageEnhancerWorkerError) {
    return error.code;
  }

  return "IMAGE_PROCESSING_FAILED";
}

function validatePayload(
  payload: ImageEnhancerQueuePayload,
): void {
  if (
    !payload ||
    typeof payload !== "object" ||
    typeof payload.jobId !== "string" ||
    !payload.jobId.trim() ||
    !payload.options ||
    typeof payload.options !== "object"
  ) {
    throw new ImageEnhancerWorkerError(
      "Invalid queue payload.",
      "INVALID_QUEUE_PAYLOAD",
    );
  }
}

/**
 * Validate that the input URL belongs to the configured ImageKit host.
 */
function validateImageKitUrl(rawUrl: string): URL {
  let url: URL;

  try {
    url = new URL(rawUrl);
  } catch {
    throw new ImageEnhancerWorkerError(
      "Invalid ImageKit image URL.",
      "INVALID_IMAGEKIT_URL",
    );
  }

  const endpoint = process.env.IMAGEKIT_URL_ENDPOINT;

  if (!endpoint) {
    throw new ImageEnhancerWorkerError(
      "ImageKit URL endpoint is not configured.",
      "IMAGEKIT_ENDPOINT_MISSING",
    );
  }

  let endpointUrl: URL;

  try {
    endpointUrl = new URL(endpoint);
  } catch {
    throw new ImageEnhancerWorkerError(
      "Invalid ImageKit URL endpoint configuration.",
      "INVALID_IMAGEKIT_ENDPOINT",
    );
  }

  if (
    url.protocol !== "https:" ||
    url.hostname !== endpointUrl.hostname ||
    url.username ||
    url.password
  ) {
    throw new ImageEnhancerWorkerError(
      "Image URL is not from the configured ImageKit host.",
      "UNTRUSTED_IMAGE_URL",
    );
  }

  return url;
}

/**
 * Download original image from ImageKit.
 */
async function downloadImageKitImage(
  imageUrl: string,
): Promise<Buffer> {
  const validatedUrl = validateImageKitUrl(imageUrl);

  const response = await fetch(validatedUrl, {
    method: "GET",
    redirect: "error",
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw new ImageEnhancerWorkerError(
      `Could not download original image. HTTP ${response.status}.`,
      "IMAGEKIT_DOWNLOAD_FAILED",
    );
  }

  const contentLength = Number(
    response.headers.get("content-length") ?? 0,
  );

  if (contentLength > MAX_INPUT_SIZE) {
    throw new ImageEnhancerWorkerError(
      "Original image exceeds the maximum file size.",
      "INPUT_IMAGE_TOO_LARGE",
    );
  }

  const arrayBuffer = await response.arrayBuffer();

  if (
    arrayBuffer.byteLength === 0 ||
    arrayBuffer.byteLength > MAX_INPUT_SIZE
  ) {
    throw new ImageEnhancerWorkerError(
      "Original image is empty or exceeds the maximum file size.",
      "INVALID_INPUT_IMAGE_SIZE",
    );
  }

  return Buffer.from(arrayBuffer);
}

/**
 * Validate ImageKit upload response.
 */
function validateImageKitUpload(
  result: ImageKitImage,
): ImageKitImage {
  if (
    !result ||
    typeof result.fileId !== "string" ||
    !result.fileId.trim() ||
    typeof result.url !== "string"
  ) {
    throw new ImageEnhancerWorkerError(
      "ImageKit did not return valid uploaded image details.",
      "IMAGEKIT_UPLOAD_INVALID_RESPONSE",
    );
  }

  validateImageKitUrl(result.url);

  return {
    fileId: result.fileId,
    url: result.url,
  };
}

/**
 * Safely delete an ImageKit file.
 */
async function safelyDeleteImageKitFile(
  fileId: string | undefined,
): Promise<void> {
  if (!fileId) {
    return;
  }

  try {
    await deleteFromImageKit(fileId);
  } catch (error) {
    console.error(
      "[ImageEnhancer] ImageKit cleanup failed:",
      error,
    );
  }
}

// --------------------------------------------------
// Worker processor
// --------------------------------------------------

async function processEnhancementJob(
  job: Job<ImageEnhancerQueuePayload>,
): Promise<ImageEnhancerWorkerResult> {
  const startedAt = Date.now();

  validatePayload(job.data);

  const { jobId, options } = job.data;

  let outputFileId: string | undefined;

  let processingClaimed = false;

  try {
    // 1. Fetch database job.
    const databaseJob = await findJobById(jobId);

    if (!databaseJob) {
      throw new ImageEnhancerWorkerError(
        "Enhancement job does not exist.",
        "JOB_NOT_FOUND",
      );
    }

    // 2. Skip already completed jobs.
    if (databaseJob.status === ImageEnhancerJobStatus.COMPLETED) {
      if (
        !databaseJob.output?.fileId ||
        !databaseJob.output?.url
      ) {
        throw new ImageEnhancerWorkerError(
          "Completed job has no ImageKit output.",
          "OUTPUT_MISSING",
        );
      }

      return {
        jobId,
        fileId: databaseJob.output.fileId,
        url: databaseJob.output.url,
        format: databaseJob.output.format,
        size: databaseJob.output.size,
        width: databaseJob.output.width,
        height: databaseJob.output.height,
        durationMs: 0,
      };
    }

    // 3. Do not process permanently failed jobs.
    if (databaseJob.status === ImageEnhancerJobStatus.FAILED) {
      throw new ImageEnhancerWorkerError(
        "This enhancement job has already failed.",
        "JOB_ALREADY_FAILED",
      );
    }

    // 4. Claim job for processing.
    const claimed = await markJobProcessing(jobId);

    if (!claimed) {
      const latestJob = await findJobById(jobId);

      if (
        latestJob?.status === ImageEnhancerJobStatus.COMPLETED &&
        latestJob.output?.fileId &&
        latestJob.output?.url
      ) {
        return {
          jobId,
          fileId: latestJob.output.fileId,
          url: latestJob.output.url,
          format: latestJob.output.format,
          size: latestJob.output.size,
          width: latestJob.output.width,
          height: latestJob.output.height,
          durationMs: 0,
        };
      }

      throw new ImageEnhancerWorkerError(
        "Job is already being processed or cannot be claimed.",
        "JOB_CLAIM_FAILED",
      );
    }

    processingClaimed = true;

    // 5. Read original image from ImageKit.
    if (!databaseJob.input?.url) {
      throw new ImageEnhancerWorkerError(
        "Original ImageKit URL is missing.",
        "INPUT_IMAGE_MISSING",
      );
    }

    const inputBuffer = await downloadImageKitImage(
      databaseJob.input.url,
    );

    // 6. Validate image dimensions.
    const metadata = await sharp(inputBuffer, {
      failOn: "error",
      limitInputPixels: MAX_IMAGE_PIXELS,
    }).metadata();

    if (
      !metadata.width ||
      !metadata.height ||
      metadata.width * metadata.height > MAX_IMAGE_PIXELS
    ) {
      throw new ImageEnhancerWorkerError(
        "Invalid image dimensions.",
        "INVALID_IMAGE_DIMENSIONS",
      );
    }

    // 7. Execute enhancement pipeline.
    // Options come from the BullMQ payload.
    const result = await runEnhancementPipeline({
      input: inputBuffer,
      options,
    });

    if (
      !Buffer.isBuffer(result.buffer) ||
      result.buffer.length === 0
    ) {
      throw new ImageEnhancerWorkerError(
        "Enhancement pipeline returned an empty image.",
        "EMPTY_OUTPUT",
      );
    }

    if (result.buffer.length > MAX_OUTPUT_SIZE) {
      throw new ImageEnhancerWorkerError(
        "Enhanced image exceeds the maximum output size.",
        "OUTPUT_TOO_LARGE",
      );
    }

    // 8. Upload enhanced image to ImageKit.
    const fileName =
      `${jobId}.${result.metadata.outputFormat}`;

    const uploadResult = await uploadToImageKit(
      result.buffer,
      fileName,
      IMAGEKIT_OUTPUT_FOLDER,
    );

    const imageKitOutput = validateImageKitUpload(
      uploadResult,
    );

    outputFileId = imageKitOutput.fileId;

    // 9. Update database with ImageKit output.
    const completed = await markJobCompleted(jobId, {
      fileId: imageKitOutput.fileId,
      url: imageKitOutput.url,
      format: result.metadata.outputFormat,
      size: result.metadata.outputSize,
      width: result.metadata.width,
      height: result.metadata.height,
    });

    if (!completed) {
      throw new ImageEnhancerWorkerError(
        "Could not finalize enhancement job.",
        "JOB_COMPLETION_FAILED",
      );
    }

    return {
      jobId,
      fileId: imageKitOutput.fileId,
      url: imageKitOutput.url,
      format: result.metadata.outputFormat,
      size: result.metadata.outputSize,
      width: result.metadata.width,
      height: result.metadata.height,
      durationMs: Date.now() - startedAt,
    };
  } catch (error) {
    // Delete partially uploaded ImageKit output.
    await safelyDeleteImageKitFile(outputFileId);

    // Mark failed and refund quota only after final retry.
    const attemptsMade = job.attemptsMade;
    const maxAttempts = job.opts.attempts ?? 1;

    const finalAttempt = attemptsMade + 1 >= maxAttempts;

    if (processingClaimed && finalAttempt) {
      try {
        await markJobFailed(jobId, {
          code: getErrorCode(error),
          message: getErrorMessage(error),
        });

        await refundDailyQuota(jobId);
      } catch (databaseError) {
        console.error(
          "[ImageEnhancer] Failed to update job status:",
          databaseError,
        );
      }
    }

    throw error;
  }
}

// --------------------------------------------------
// Worker instance
// --------------------------------------------------

export const imageEnhancerWorker = WORKER_ENABLED
  ? new Worker<
      ImageEnhancerQueuePayload,
      ImageEnhancerWorkerResult
    >(
      QUEUE_NAME,
      processEnhancementJob,
      {
        concurrency: WORKER_CONCURRENCY,
        lockDuration: LOCK_DURATION,
        stalledInterval: STALLED_INTERVAL,

        connection: {
          host: process.env.REDIS_HOST ?? "127.0.0.1",
          port: Number(process.env.REDIS_PORT ?? 6379),
          password: process.env.REDIS_PASSWORD || undefined,
          maxRetriesPerRequest: null,
        },
      },
    )
  : null;

// --------------------------------------------------
// Worker events
// --------------------------------------------------

if (imageEnhancerWorker) {
  imageEnhancerWorker.on("ready", () => {
    console.info("[ImageEnhancer] Worker is ready.");
  });

  imageEnhancerWorker.on("active", (job) => {
    console.info(
      `[ImageEnhancer] Processing job: ${job.id}`,
    );
  });

  imageEnhancerWorker.on("completed", (job, result) => {
    console.info(
      `[ImageEnhancer] Completed job: ${job.id}`,
      {
        size: result.size,
        durationMs: result.durationMs,
      },
    );
  });

  imageEnhancerWorker.on("failed", (job, error) => {
    console.error(
      `[ImageEnhancer] Job failed: ${job?.id}`,
      error,
    );
  });

  imageEnhancerWorker.on("stalled", (jobId) => {
    console.warn(
      `[ImageEnhancer] Stalled job: ${jobId}`,
    );
  });

  imageEnhancerWorker.on("error", (error) => {
    console.error(
      "[ImageEnhancer] Worker error:",
      error,
    );
  });
}

// --------------------------------------------------
// Graceful shutdown
// --------------------------------------------------

let shutdownPromise: Promise<void> | null = null;

export async function closeImageEnhancerWorker(): Promise<void> {
  if (!imageEnhancerWorker) {
    return;
  }

  if (!shutdownPromise) {
    shutdownPromise = (async () => {
      console.info(
        "[ImageEnhancer] Closing worker...",
      );

      await imageEnhancerWorker.close();

      console.info(
        "[ImageEnhancer] Worker closed.",
      );
    })();
  }

  await shutdownPromise;
}
