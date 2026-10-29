
import { Router } from "express";

import {
  getUserActivities,
} from "../controllers/activity.controller.js";

import {
  authenticate,
} from "../middlewares/auth.middleware.js";

import {
  validate,
} from "../middlewares/validate.middleware.js";

import {
  apiLimiter,
} from "../middlewares/rate-limit.middleware.js";

import {
  getActivityLogsQuerySchema,
} from "../validators/activitylog.validator.js";

// =====================================
// Activity Router
// =====================================

const router = Router();

// Apply rate limiting.
router.use(apiLimiter);

// All activity endpoints require login.
// authenticate should verify the
// HttpOnly meettools_token cookie.
router.use(authenticate);

// =====================================
// Routes
// =====================================

// GET /api/v1/activity
router.get(
  "/",
  validate({
    validate(input) {
      const result = getActivityLogsQuerySchema.safeParse(input);

      if (!result.success) {
        return {
          error: {
            details: result.error.issues.map(({ message }) => ({ message })),
          },
          value: input,
        };
      }

      return { value: result.data };
    },
  }),
  getUserActivities
);

export default router;
