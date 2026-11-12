
import type {
  ImageEnhancerActorType,
  ImageEnhancerJobStatus,
} from "../imageEnhancer.model";

import type {
  ImageEnhancementOptions,
  ValidatedImageMetadata,
} from "../../validators/imageEnhancer.validation";

/**
 * Actor making an enhancement request.
 *
 * For guests, actorId must be a server-generated HMAC
 * of the normalized client IP address.
 */
export interface ImageEnhancerActor {
  actorType: ImageEnhancerActorType;
  actorId: string;
}

/**
 * Input accepted by the enhancement service.
 */
export interface CreateImageEnhancerJobInput {
  actor: ImageEnhancerActor;
  file: Express.Multer.File;
  options: unknown;
}

/**
 * Validated options passed to the processing worker.
 */
export interface ImageEnhancerQueuePayload {
  jobId: string;
  options: ImageEnhancementOptions;
}

/**
 * Queue configuration.
 */
export interface ImageEnhancerQueueOptions {
  attempts: number;
  backoff: {
    type: "exponential";
    delay: number;
  };
}

/**
 * ImageKit output metadata.
 */
export interface ImageEnhancerOutput {
  fileId: string;
  url: string;
  format: "webp" | "jpeg" | "png";
  size: number;
  width: number;
  height: number;
}

/**
 * Image enhancement job response.
 */
export interface ImageEnhancerJobResponse {
  jobId: string;
  status: ImageEnhancerJobStatus;
  message: string;
}

/**
 * Daily usage information.
 */
export interface ImageEnhancerUsageResponse {
  used: number;
  limit: number;
  remaining: number;
  date: string;
}

/**
 * Job status response.
 */
export interface ImageEnhancerStatusResponse {
  jobId: string;
  status: ImageEnhancerJobStatus;
  originalName: string;
  createdAt: Date;
  completedAt?: Date;
}

/**
 * Download URL service response.
 */
export interface ImageEnhancerDownloadResponse {
  downloadUrl: string;
  expiresAt: Date;
}

/**
 * Repository input for creating a job.
 */
export interface CreateImageEnhancerJobRecord {
  jobId: string;
  actorType: ImageEnhancerActorType;
  actorId: string;
  status: ImageEnhancerJobStatus;
  input: ValidatedImageMetadata & {
    fileId: string;
    url: string;
  };
  quotaDate: string;
  expiresAt: Date;
}

/**
 * Repository input for reserving daily usage.
 */
export interface ReserveImageEnhancerQuotaInput {
  actorType: ImageEnhancerActorType;
  actorId: string;
  date: string;
  limit: number;
}

/**
 * Repository input for refunding usage.
 */
export interface RefundImageEnhancerQuotaInput {
  jobId: string;
}

/**
 * Repository input for finding an actor's job.
 */
export interface FindImageEnhancerJobInput {
  jobId: string;
  actorType: ImageEnhancerActorType;
  actorId: string;
}
