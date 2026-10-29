
import mongoose from "mongoose";

import type {
  Request,
  Response,
  NextFunction,
} from "express";

import { User } from "../models/User.model.js";
import { ApiError } from "../utils/ApiError.js";
import { STATUS_CODES } from "../utils/statusCodes.js";
import { asyncHandler } from "../utils/asyncHandler.js";

import type {
  AuthenticatedRequest,
} from "./auth.middleware.js";

/**
 * @desc    Verify current user has admin privileges
 * @access  Private / Admin
 *
 * Must be used AFTER authenticate middleware.
 */
export const isAdmin = asyncHandler(
  async (
    req: AuthenticatedRequest,
    _res: Response,
    _next: NextFunction
  ) => {
    const rawUserId =
      req.user?.id ??
      req.user?._id;

    const userId =
      rawUserId?.toString();

    // User is not authenticated.
    if (
      !userId ||
      !mongoose.isValidObjectId(userId)
    ) {
      throw new ApiError(
        STATUS_CODES.UNAUTHORIZED,
        "Authentication required."
      );
    }

    // Verify current role from database,
    // not just from a potentially stale JWT.
    const user = await User.findById(
      userId
    )
      .select("role")
      .lean();

    if (!user) {
      throw new ApiError(
        STATUS_CODES.UNAUTHORIZED,
        "User account not found."
      );
    }

    if (user.role !== "admin") {
      throw new ApiError(
        STATUS_CODES.FORBIDDEN,
        "Access denied. Admin privileges required."
      );
    }

    // asyncHandler resolves successfully,
    // allowing Express to continue.
  }
);
