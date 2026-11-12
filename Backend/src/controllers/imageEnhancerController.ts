
import type { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";

import {
  ImageEnhancerJobModel,
  ImageEnhancerJobStatus,
  ImageEnhancerActorType,
} from "../models/imageEnhancer.model";

import * as imageEnhancerService from "../service/imageEnhancer.service";

interface ImageEnhancerRequest extends Request {
  user?: {
    id?: string;
    _id?: string | mongoose.Types.ObjectId;
  };

  guestId?: string;
}

function sendSuccess(
  res: Response,
  statusCode: number,
  message: string,
  data?: unknown,
) {
  return res.status(statusCode).json({
    success: true,
    message,
    ...(data !== undefined ? { data } : {}),
  });
}

function getAuthenticatedUserId(
  req: ImageEnhancerRequest,
): string | undefined {
  const rawUserId =
    req.user?.id ??
    req.user?._id?.toString();

  if (!rawUserId) {
    return undefined;
  }

  if (!mongoose.isValidObjectId(rawUserId)) {
    throw new Error("Invalid authenticated user.");
  }

  return rawUserId;
}

function getActor(req: ImageEnhancerRequest) {
  const userId = getAuthenticatedUserId(req);
  const guestId = req.guestId;

  if (!userId && !guestId) {
    throw new Error(
      "Guest identity missing. Please refresh and try again.",
    );
  }

  if (userId) {
    return {
      actorType: ImageEnhancerActorType.USER,
      actorId: userId,
    };
  }

  return {
    actorType: ImageEnhancerActorType.GUEST,
    actorId: guestId!,
  };
}

/**
 * POST /api/v1/enhancer
 */
export async function createEnhancementJob(
  req: ImageEnhancerRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const actor = getActor(req);
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "Please upload an image.",
      });
    }

    const result =
      await imageEnhancerService.createEnhancementJob({
        actor,
        file,
        options: req.body,
      });

    return sendSuccess(
      res,
      202,
      "Image enhancement job has been queued.",
      result,
    );
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/enhancer/:jobId
 */
export async function getEnhancementJobStatus(
  req: ImageEnhancerRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { jobId } = req.params;

    if (!jobId || typeof jobId !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid job ID.",
      });
    }

    const actor = getActor(req);

    const job = await ImageEnhancerJobModel.findOne({
      jobId,
      actorType: actor.actorType,
      actorId: actor.actorId,
    })
      .select(
        "jobId status input.originalName output error createdAt completedAt",
      )
      .lean();

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Enhancement job not found.",
      });
    }

    return sendSuccess(
      res,
      200,
      "Job status retrieved successfully.",
      job,
    );
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/enhancer/:jobId/result
 */
export async function getEnhancementResult(
  req: ImageEnhancerRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { jobId } = req.params;

    if (!jobId || typeof jobId !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid job ID.",
      });
    }

    const actor = getActor(req);

    const job = await ImageEnhancerJobModel.findOne({
      jobId,
      actorType: actor.actorType,
      actorId: actor.actorId,
    })
      .select("jobId status output expiresAt")
      .lean();

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Enhancement job not found.",
      });
    }

    if (
      job.status !== ImageEnhancerJobStatus.COMPLETED ||
      !job.output
    ) {
      return res.status(409).json({
        success: false,
        message: "Image enhancement is not completed yet.",
        data: {
          status: job.status,
        },
      });
    }

    const result =
      await imageEnhancerService.getEnhancementDownloadUrl({
        url: job.output.url,
        expiresAt: job.expiresAt,
      });

    return sendSuccess(
      res,
      200,
      "Enhanced image is ready.",
      {
        jobId: job.jobId,
        output: {
          fileId: job.output.fileId,
          url: job.output.url,
          format: job.output.format,
          size: job.output.size,
          width: job.output.width,
          height: job.output.height,
        },
        downloadUrl: result.downloadUrl,
        expiresAt: job.expiresAt,
      },
    );
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/enhancer/:jobId/download
 *
 * Downloads enhanced image as an attachment.
 */
export async function downloadEnhancementResult(
  req: ImageEnhancerRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { jobId } = req.params;

    if (!jobId || typeof jobId !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid job ID.",
      });
    }

    const actor = getActor(req);

    const job = await ImageEnhancerJobModel.findOne({
      jobId,
      actorType: actor.actorType,
      actorId: actor.actorId,
    })
      .select(
        "jobId status input.originalName output expiresAt",
      )
      .lean();

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Enhancement job not found for this user.",
      });
    }

    if (
      job.status !== ImageEnhancerJobStatus.COMPLETED ||
      !job.output
    ) {
      return res.status(409).json({
        success: false,
        message: "Image enhancement is not completed yet.",
        data: {
          status: job.status,
        },
      });
    }

    if (
      !job.expiresAt ||
      new Date(job.expiresAt).getTime() <= Date.now()
    ) {
      return res.status(410).json({
        success: false,
        message: "Enhanced image has expired. Please enhance the image again.",
      });
    }

    const downloaded =
      await imageEnhancerService.downloadEnhancedImage({
        url: job.output.url,
        expiresAt: job.expiresAt,
        originalName: job.input?.originalName,
        format: job.output.format,
      });

    res.setHeader("Content-Type", downloaded.contentType);

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${downloaded.fileName}"`,
    );

    res.setHeader(
      "Content-Length",
      downloaded.buffer.length.toString(),
    );

    res.setHeader(
      "Cache-Control",
      "private, no-store, no-cache, must-revalidate",
    );

    res.setHeader("X-Content-Type-Options", "nosniff");

    return res.status(200).send(downloaded.buffer);
  } catch (error) {
    next(error);
  }
}
