
import mongoose from "mongoose";

import {
  ImageEnhancerJobModel,
  ImageEnhancerDailyUsageModel,
  ImageEnhancerJobStatus,
  ImageEnhancerActorType,
  IMAGE_ENHANCER_DAILY_LIMIT,
} from "../imageEnhancer.model";

import { Job } from "../Job.model";

import type {
  CreateImageEnhancerJobRecord,
  FindImageEnhancerJobInput,
  ReserveImageEnhancerQuotaInput,
  ImageEnhancerOutput,
} from "./imageEnhancer.types";

/**
 * Detect MongoDB duplicate key errors.
 */
function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
}

/**
 * Ensure a daily usage record exists.
 */
export async function ensureDailyUsageRecord(
  input: ReserveImageEnhancerQuotaInput,
): Promise<void> {
  const { actorType, actorId, date, limit } = input;

  try {
    await ImageEnhancerDailyUsageModel.updateOne(
      {
        actorType,
        actorId,
        date,
      },
      {
        $setOnInsert: {
          actorType,
          actorId,
          date,
          used: 0,
          limit,
        },
      },
      {
        upsert: true,
      },
    );
  } catch (error) {
    if (!isDuplicateKeyError(error)) {
      throw error;
    }
  }
}

/**
 * Atomically reserve one daily usage unit.
 */
export async function reserveDailyQuota(
  input: ReserveImageEnhancerQuotaInput,
): Promise<boolean> {
  const { actorType, actorId, date, limit } = input;

  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error("Invalid image enhancer daily limit.");
  }

  await ensureDailyUsageRecord(input);

  const result = await ImageEnhancerDailyUsageModel.updateOne(
    {
      actorType,
      actorId,
      date,
      $expr: {
        $lt: ["$used", "$limit"],
      },
    },
    {
      $inc: {
        used: 1,
      },
    },
  );

  return result.modifiedCount === 1;
}

/**
 * Create a new enhancement job.
 */
export async function createJob(
  data: CreateImageEnhancerJobRecord,
) {
  const [job] = await ImageEnhancerJobModel.create([data]);
  return job;
}

/**
 * Find a job belonging to a particular actor.
 */
export async function findJobForActor(
  input: FindImageEnhancerJobInput,
) {
  return ImageEnhancerJobModel.findOne({
    jobId: input.jobId,
    actorType: input.actorType,
    actorId: input.actorId,
  }).lean();
}

/**
 * Find a job by ID.
 */
export async function findJobById(jobId: string) {
  return ImageEnhancerJobModel.findOne({
    jobId,
  }).lean();
}

/**
 * Attach BullMQ job ID to the database job.
 */
export async function setQueueJobId(
  jobId: string,
  queueJobId: string,
): Promise<boolean> {
  const result = await ImageEnhancerJobModel.updateOne(
    {
      jobId,
      status: ImageEnhancerJobStatus.QUEUED,
    },
    {
      $set: {
        queueJobId,
      },
    },
  );

  return result.modifiedCount === 1;
}

/**
 * Mark a job as processing.
 */
export async function markJobProcessing(
  jobId: string,
): Promise<boolean> {
  const result = await ImageEnhancerJobModel.updateOne(
    {
      jobId,
      status: ImageEnhancerJobStatus.QUEUED,
    },
    {
      $set: {
        status: ImageEnhancerJobStatus.PROCESSING,
        startedAt: new Date(),
      },
    },
  );

  return result.modifiedCount === 1;
}

/**
 * Mark enhancement as completed and save/update its output
 * in the generic Dashboard Job collection.
 *
 * Supports both registered users and guests.
 */
export async function markJobCompleted(
  jobId: string,
  output: ImageEnhancerOutput,
): Promise<boolean> {
  const session = await mongoose.startSession();

  try {
    let completed = false;

    await session.withTransaction(async () => {
      const enhancerJob = await ImageEnhancerJobModel.findOne({
        jobId,
        status: ImageEnhancerJobStatus.PROCESSING,
      }).session(session);

      if (!enhancerJob) {
        completed = false;
        return;
      }

      const input = enhancerJob.input;

      if (
        !input.fileId ||
        !input.url ||
        !input.originalName ||
        !output.fileId ||
        !output.url
      ) {
        throw new Error(
          "Image Enhancer input or output file information is incomplete.",
        );
      }

      if (
        !["jpeg", "png", "webp", "avif"].includes(output.format)
      ) {
        throw new Error("Unsupported enhanced image output format.");
      }

      const isUser =
        enhancerJob.actorType === ImageEnhancerActorType.USER;

      const isGuest =
        enhancerJob.actorType === ImageEnhancerActorType.GUEST;

      if (!isUser && !isGuest) {
        throw new Error("Invalid Image Enhancer actor type.");
      }

      if (!enhancerJob.actorId?.trim()) {
        throw new Error("Invalid Image Enhancer actor ID.");
      }

      // Registered user ownership.
      // Guest ownership uses the server-generated HMAC actorId.
      const ownership = isUser
        ? (() => {
            if (!mongoose.isValidObjectId(enhancerJob.actorId)) {
              throw new Error("Invalid Image Enhancer user ID.");
            }

            return {
              userId: new mongoose.Types.ObjectId(
                enhancerJob.actorId,
              ),
            };
          })()
        : {
            guestId: enhancerJob.actorId,
          };

      const completedAt = new Date();

      const dashboardInputFile = {
        fileId: input.fileId,
        url: input.url,
        fileName: input.originalName,
        fileSize: input.size,
        width: input.width,
        height: input.height,
      };

      const dashboardOutputFile = {
        fileId: output.fileId,
        url: output.url,
        fileName: `${input.originalName.replace(/\.[^.]+$/, "")}-enhanced.${output.format}`,
        fileSize: output.size,
        width: output.width,
        height: output.height,
      };

      // Save the Dashboard record under the correct owner.
      await Job.updateOne(
        {
          sourceEnhancerJobId: jobId,
          ...ownership,
        },
        {
          $set: {
            ...ownership,
            tool: "image-enhancer",
            sourceEnhancerJobId: jobId,
            status: "completed",
            progress: 100,
            inputFiles: [dashboardInputFile],
            outputFiles: [dashboardOutputFile],
            options: {
              mode: "fit",
              outputFormat: output.format,
              quality: 80,
              maintainAspectRatio: true,
            },
            completedAt,
          },
        },
        {
          upsert: true,
          session,
          runValidators: true,
        },
      );

      // Complete the original Image Enhancer job.
      const result = await ImageEnhancerJobModel.updateOne(
        {
          jobId,
          status: ImageEnhancerJobStatus.PROCESSING,
        },
        {
          $set: {
            status: ImageEnhancerJobStatus.COMPLETED,
            output,
            completedAt,
          },
          $unset: {
            error: 1,
          },
        },
        {
          session,
        },
      );

      if (result.modifiedCount !== 1) {
        throw new Error(
          "Failed to complete Image Enhancer job.",
        );
      }

      completed = true;
    });

    return completed;
  } finally {
    await session.endSession();
  }
}

/**
 * Mark a job as failed.
 */
export async function markJobFailed(
  jobId: string,
  error: {
    code: string;
    message: string;
  },
): Promise<boolean> {
  const result = await ImageEnhancerJobModel.updateOne(
    {
      jobId,
      status: {
        $in: [
          ImageEnhancerJobStatus.QUEUED,
          ImageEnhancerJobStatus.PROCESSING,
        ],
      },
    },
    {
      $set: {
        status: ImageEnhancerJobStatus.FAILED,
        error: {
          code: error.code.slice(0, 100),
          message: error.message.slice(0, 500),
        },
        completedAt: new Date(),
      },
    },
  );

  return result.modifiedCount === 1;
}

/**
 * Refund quota exactly once.
 */
export async function refundDailyQuota(
  jobId: string,
): Promise<boolean> {
  const session = await mongoose.startSession();

  try {
    let refunded = false;

    await session.withTransaction(async () => {
      const job = await ImageEnhancerJobModel.findOneAndUpdate(
        {
          jobId,
          status: ImageEnhancerJobStatus.FAILED,
          quotaRefundedAt: {
            $exists: false,
          },
        },
        {
          $set: {
            quotaRefundedAt: new Date(),
          },
        },
        {
          new: true,
          session,
        },
      );

      if (!job) {
        refunded = false;
        return;
      }

      const usageUpdate =
        await ImageEnhancerDailyUsageModel.updateOne(
          {
            actorType: job.actorType,
            actorId: job.actorId,
            date: job.quotaDate,
            used: {
              $gt: 0,
            },
          },
          {
            $inc: {
              used: -1,
            },
          },
          {
            session,
          },
        );

      if (usageUpdate.modifiedCount !== 1) {
        throw new Error(
          "Quota refund failed because the usage record was not found.",
        );
      }

      refunded = true;
    });

    return refunded;
  } finally {
    await session.endSession();
  }
}

/**
 * Read daily usage.
 */
export async function getDailyUsage(
  actorType: ImageEnhancerActorType,
  actorId: string,
  date: string,
) {
  const usage = await ImageEnhancerDailyUsageModel.findOne({
    actorType,
    actorId,
    date,
  }).lean();

  if (!usage) {
    return {
      used: 0,
      limit: IMAGE_ENHANCER_DAILY_LIMIT,
      remaining: IMAGE_ENHANCER_DAILY_LIMIT,
      date,
    };
  }

  return {
    used: usage.used,
    limit: usage.limit,
    remaining: Math.max(0, usage.limit - usage.used),
    date: usage.date,
  };
}

/**
 * Delete a job record.
 */
export async function deleteJob(
  jobId: string,
): Promise<boolean> {
  const result = await ImageEnhancerJobModel.deleteOne({
    jobId,
  });

  return result.deletedCount === 1;
}
