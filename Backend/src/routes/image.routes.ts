
import { Router } from "express";

import {
  resizeImage,
  uploadAndResizeImage,
  getJobResultStatus,
} from "../controllers/image.controller.js";

import {
  optionalAuthenticate,
} from "../middlewares/optionalAuth.middleware.js";

import {
  validate,
} from "../middlewares/validate.middleware.js";

import {
  upload,
  verifyRealImage,
} from "../middlewares/multer.middleware.js";

import {
  apiLimiter,
} from "../middlewares/rate-limit.middleware.js";

import {
  resizeImageSchema,
} from "../validators/image.validator.js";

const router = Router();

const resizeImageValidationSchema = {
  validate(input: unknown) {
    const result = resizeImageSchema.safeParse(input);

    if (result.success) {
      return { value: result.data };
    }

    return {
      error: {
        details: result.error.issues.map(({ message }) => ({ message })),
      },
      value: input,
    };
  },
} as unknown as Parameters<typeof validate>[0];

// Rate limiting for all image routes.
router.use(apiLimiter);

// =====================================
// Resize / Compress
// =====================================

router.post(
  "/resize",
  optionalAuthenticate,
  upload.single("image"),
  verifyRealImage,
  validate(resizeImageValidationSchema),
  resizeImage
);

// =====================================
// Upload / Resize
// =====================================

router.post(
  "/upload",
  optionalAuthenticate,
  upload.single("image"),
  verifyRealImage,
  validate(resizeImageValidationSchema),
  uploadAndResizeImage
);

// =====================================
// Processing Status
// =====================================

router.get(
  "/status/:jobId",
  optionalAuthenticate,
  getJobResultStatus
);

export default router;
