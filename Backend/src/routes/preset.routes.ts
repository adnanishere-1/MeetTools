
import { Router } from "express";

import {
  createPreset,
  getUserPresets,
  deletePreset,
} from "../controllers/preset.controller.js";

import { authenticate } from "../middlewares/auth.middleware.js";

import { validate } from "../middlewares/validate.middleware.js";

import { apiLimiter } from "../middlewares/rate-limit.middleware.js";

import {
  createPresetSchema,
  presetIdParamSchema,
} from "../validators/preset.validator.js";

// =====================================
// Preset Router
// =====================================

const router = Router();

// Apply rate limiting to preset endpoints.
router.use(apiLimiter);

// All preset routes require authentication.
// authenticate should read meettools_token
// from the HttpOnly cookie.
router.use(authenticate);

// =====================================
// Routes
// =====================================

// Create a new preset.
router.post(
  "/",
  validate(createPresetSchema),
  createPreset
);

// Get logged-in user's presets.
router.get(
  "/",
  getUserPresets
);

// Delete logged-in user's preset.
router.delete(
  "/:presetId",
  validate(presetIdParamSchema),
  deletePreset
);

export default router;
