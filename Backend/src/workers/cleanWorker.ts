
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

interface CleanJobData {
  userId: string;
  fileId: string;
  fileUrl: string;
}

interface CleanJobResult {
  success: boolean;
  cleanedUrl: string;
  fileId: string;
}

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
    "Invalid REDIS_PORT configuration."
  );
}

const redisConnection = {
  host: process.env.REDIS_HOST || "localhost",
  port: redisPort,
  password: process.env.REDIS_PASSWORD || undefined,

  // Required for BullMQ workers.
  maxRetriesPerRequest: null,
};

// =====================================
// Validation Helpers
// =====================================

function validateCleanJob(
  data: CleanJobData
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
    typeof data.fileId !== "string" ||
    !data.fileId.trim()
  ) {
    throw new Error(
      "Missing or invalid fileId."
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
      "Invalid image URL."
    );
  }

  if (
    parsedUrl.protocol !== "https:" &&
    parsedUrl.protocol !== "http:"
  ) {
    throw new Error(
      "Image URL must use HTTP or HTTPS."
    );
  }

  // IMPORTANT:
  // URL validation alone does not prove that
  // the image belongs to the authenticated user.
  // The API creating this queue job must check
  // ownership before adding the job.
}

// =====================================
// Process Image Clean Job
// =====================================

const processCleanJob = async (
  job: Job<CleanJobData, CleanJobResult>
): Promise<CleanJobResult> => {
  const {
    userId,
    fileId,
    fileUrl,
  } = job.data;

  logger.info(
    `🧹 Starting CLEAN job ${job.id} for user ${userId}`
  );

  try {
    // Step 1: Validate job data.
    validateCleanJob(job.data);

    await job.updateProgress(20);

    // Step 2: Generate ImageKit optimized URL.
    //
    // quality: 85 = quality optimization
    // format: auto = automatic format selection
    //
    // NOTE:
    // This URL generation does not guarantee
    // permanent metadata removal.

    const cleanedUrl = imagekit.url({
      src: fileUrl,
      transformation: [
        {
          quality: "85",
          format: "auto",
        },
      ],
    });

    await job.updateProgress(70);

    // Step 3: Preserve the original image.
    //
    // Original file is NOT deleted.
    // User can reuse the image from Dashboard.

    const result: CleanJobResult = {
      success: true,
      cleanedUrl,
      fileId,
    };

    await job.updateProgress(100);

    logger.info(
      `✅ Clean job ${job.id} completed successfully`
    );

    return result;
  } catch (error: unknown) {
    logger.error(
      {
        err: error,
        jobId: job.id,
        userId,
      },
      "❌ Image clean job failed"
    );

    throw error;
  }
};

// =====================================
// Initialize BullMQ Worker
// =====================================

export const cleanWorker = new Worker<
  CleanJobData,
  CleanJobResult
>(
  "meettools-clean-queue",
  processCleanJob,
  {
    connection: redisConnection,

    // Lightweight URL generation jobs.
    concurrency: 10,
  }
);

// =====================================
// Worker Event Listeners
// =====================================

cleanWorker.on("ready", () => {
  logger.info(
    "✅ MeetTools Clean Worker connected to Redis."
  );
});

cleanWorker.on("completed", (job) => {
  logger.info(
    `🎉 Clean job ${job.id} completed successfully.`
  );
});

cleanWorker.on("failed", (job, error) => {
  logger.error(
    {
      err: error,
      jobId: job?.id ?? "unknown",
    },
    "❌ Clean job failed"
  );
});

cleanWorker.on("error", (error) => {
  logger.error(
    {
      err: error,
    },
    "❌ Clean Worker Redis/BullMQ error"
  );
});

// =====================================
// Graceful Shutdown
// =====================================

// If this worker runs in a dedicated process,
// call closeCleanWorker() during shutdown.
//
// If multiple workers run in one process,
// close all of them from the central server
// shutdown handler.

export async function closeCleanWorker():
  Promise<void> {
  logger.info(
    "🛑 Closing MeetTools Clean Worker..."
  );

  await cleanWorker.close();

  logger.info(
    "✅ MeetTools Clean Worker closed successfully."
  );
}
