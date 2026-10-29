
import {
  Router,
  type RequestHandler,
} from "express";

import {
  deleteJob,
  getJobById,
  getUserJobs,
} from "../controllers/job.controller.js";

import { authenticate } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { apiLimiter } from "../middlewares/rate-limit.middleware.js";

import {
  getJobByIdSchema,
  getUserJobsQuerySchema,
} from "../validators/job.validator.js";

import mongoose from "mongoose";

import { ApiError } from "../utils/ApiError.js";
import { STATUS_CODES } from "../utils/statusCodes.js";

// =====================================
// Router
// =====================================

const router = Router();

router.use(apiLimiter);
router.use(authenticate);

// =====================================
// Delete ID Validator
// =====================================

const validateDeleteJobId: RequestHandler = (
  req,
  _res,
  next
) => {
  const id = req.params.id;

  if (
    typeof id !== "string" ||
    !mongoose.isValidObjectId(id)
  ) {
    next(
      new ApiError(
        STATUS_CODES.BAD_REQUEST,
        "Invalid job ID"
      )
    );
    return;
  }

  next();
};

const validateGetJobById: RequestHandler = (
  req,
  _res,
  next
) => {
  const result = getJobByIdSchema.safeParse({
    params: req.params,
  });

  if (!result.success) {
    next(
      new ApiError(
        STATUS_CODES.BAD_REQUEST,
        result.error.issues[0]?.message ?? "Invalid job ID"
      )
    );
    return;
  }

  next();
};

const validateGetUserJobsQuery: RequestHandler = (
  req,
  _res,
  next
) => {
  const result = getUserJobsQuerySchema.safeParse({
    query: req.query,
  });

  if (!result.success) {
    next(
      new ApiError(
        STATUS_CODES.BAD_REQUEST,
        result.error.issues[0]?.message ?? "Invalid query parameters"
      )
    );
    return;
  }

  next();
};

// =====================================
// Routes
// =====================================

router.get(
  "/",
  validateGetUserJobsQuery,
  getUserJobs
);

router.get(
  "/:jobId",
  validateGetJobById,
  getJobById
);

router.delete(
  "/:id",
  validateDeleteJobId,
  deleteJob
);

export default router;
