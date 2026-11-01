
import { Router } from "express";

import {
  register,
  verifyOTP,
  resendOTP,
  login,
  logout,
} from "../controllers/auth.controller.js";

import { authenticate } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";

import {
  apiLimiter,
  authLimiter,
} from "../middlewares/rate-limit.middleware.js";

import {
  registerSchema,
  verifyOTPSchema,
  resendOTPSchema,
  loginSchema,
} from "../validators/auth.validator.js";

const router = Router();

// General API protection.
router.use(apiLimiter);

// =====================================
// Authentication Routes
// =====================================

router.post(
  "/register",
  authLimiter,
  validate(registerSchema),
  register
);

router.post(
  "/verify-otp",
  authLimiter,
  validate(verifyOTPSchema),
  verifyOTP
);

router.post(
  "/resend-otp",
  authLimiter,
  validate(resendOTPSchema),
  resendOTP
);

router.post(
  "/login",
  authLimiter,
  validate(loginSchema),
  login
);

// =====================================
// Logout
// =====================================

router.post(
  "/logout",
  authenticate,
  logout
);

export default router;
