
import "dotenv/config";

import {
  Worker,
  type Job,
} from "bullmq";

import { imagekit } from "../config/imagekit.js";
import { redisConnectionOptions } from "../config/redis.js";
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
    throw new Error("Missing or invalid userId.");
  }

  if (
    typeof data.fileId !== "string" ||
    !data.fileId.trim()
  ) {
    throw new Error("Missing or invalid fileId.");
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
    throw new Error("Invalid image URL.");
  }

  if (
    parsedUrl.protocol !== "https:" &&
    parsedUrl.protocol !== "http:"
  ) {
    throw new Error(
      "Image URL must use HTTP or HTTPS."
    );
  }
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
    validateCleanJob(job.data);

    await job.updateProgress(20);

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
  "meetools-clean-queue",
  processCleanJob,
  {
    connection: {
      redisConnectionOptions,
    },
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
