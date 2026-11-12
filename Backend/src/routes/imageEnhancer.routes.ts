
import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";

import {
  createEnhancementJob,
  getEnhancementJobStatus,
  getEnhancementResult,
  downloadEnhancementResult,
} from "../controllers/imageEnhancerController.js";

import {
  optionalAuthenticate,
} from "../middlewares/optionalAuth.middleware.js";

import {
  upload,
  verifyRealImage,
} from "../middlewares/multer.middleware.js";

import {
  validate,
} from "../middlewares/validate.middleware.js";

import {
  imageEnhancementOptionsSchema,
  imageEnhancerParamsSchema,
} from "../validators/imageEnhancer.validation.js";

import { redis } from "../config/redis.js";

const router = Router();

/**
 * Shared Redis store.
 */
const createRedisStore = (prefix: string) =>
  new RedisStore({
    prefix,
    sendCommand: (...args: string[]) =>
      redis.call(
        args[0]!,
        ...args.slice(1)
      ) as Promise<number | string>,
  });

/**
 * Image enhancement upload rate limiter.
 */
const imageEnhancerUploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  store: createRedisStore("rl:image-enhancer:upload:"),
  passOnStoreError: false,
  message: {
    success: false,
    message:
      "Too many image enhancement requests. Please try again later.",
  },
});

/**
 * Image enhancement status rate limiter.
 */
const imageEnhancerStatusLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  store: createRedisStore("rl:image-enhancer:status:"),
  passOnStoreError: false,
  message: {
    success: false,
    message:
      "Too many status requests. Please try again shortly.",
  },
});

/**
 * Image enhancement result rate limiter.
 */
const imageEnhancerResultLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  store: createRedisStore("rl:image-enhancer:result:"),
  passOnStoreError: false,
  message: {
    success: false,
    message:
      "Too many result requests. Please try again shortly.",
  },
});

/**
 * Image enhancement download rate limiter.
 */
const imageEnhancerDownloadLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  store: createRedisStore("rl:image-enhancer:download:"),
  passOnStoreError: false,
  message: {
    success: false,
    message:
      "Too many download requests. Please try again shortly.",
  },
});

/**
 * POST /api/v1/enhancer
 *
 * Create image enhancement job.
 */
router.post(
  "/",
  imageEnhancerUploadLimiter,
  optionalAuthenticate,
  upload.single("image"),
  verifyRealImage,
  validate(imageEnhancementOptionsSchema, {
    source: "body",
    wrapped: false,
  }),
  createEnhancementJob
);

/**
 * GET /api/v1/enhancer/:jobId
 *
 * Get enhancement job status.
 */
router.get(
  "/:jobId",
  imageEnhancerStatusLimiter,
  optionalAuthenticate,
  validate(imageEnhancerParamsSchema, {
    source: "params",
    wrapped: false,
  }),
  getEnhancementJobStatus
);

/**
 * GET /api/v1/enhancer/:jobId/result
 *
 * Get completed enhancement result.
 */
router.get(
  "/:jobId/result",
  imageEnhancerResultLimiter,
  optionalAuthenticate,
  validate(imageEnhancerParamsSchema, {
    source: "params",
    wrapped: false,
  }),
  getEnhancementResult
);

/**
 * GET /api/v1/enhancer/:jobId/download
 *
 * Download enhanced image as an attachment.
 */
router.get(
  "/:jobId/download",
  imageEnhancerDownloadLimiter,
  optionalAuthenticate,
  validate(imageEnhancerParamsSchema, {
    source: "params",
    wrapped: false,
  }),
  downloadEnhancementResult
);

export default router;
