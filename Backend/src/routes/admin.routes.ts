
import { Router } from "express";

import {
  getDashboardStats,
} from "../controllers/admin.controller.js";

import {
  authenticate,
} from "../middlewares/auth.middleware.js";

import {
  isAdmin,
} from "../middlewares/isadmin.js";

import {
  apiLimiter,
} from "../middlewares/rate-limit.middleware.js";

// =====================================
// Admin Router
// =====================================

const router = Router();

// Apply rate limiting to admin routes.
router.use(apiLimiter);

// Require authentication first.
router.use(authenticate);

// Verify admin role from database.
router.use(isAdmin);

// =====================================
// Admin Dashboard
// =====================================

/**
 * @desc    Get admin dashboard statistics
 * @route   GET /api/v1/admin/dashboard
 * @access  Private / Admin
 */
router.get(
  "/dashboard",
  getDashboardStats
);

export default router;
