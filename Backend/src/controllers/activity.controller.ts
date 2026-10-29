
import mongoose from "mongoose";

import type {
  Response,
} from "express";

import {
  ActivityLog,
} from "../models/ActivityLog.model.js";

import {
  asyncHandler,
} from "../utils/asyncHandler.js";

import {
  ApiError,
} from "../utils/ApiError.js";

import {
  STATUS_CODES,
} from "../utils/statusCodes.js";

import type {
  AuthenticatedRequest,
} from "../middlewares/auth.middleware.js";

// =====================================
// Get User Activity History
// GET /api/v1/activity
// =====================================

export const getUserActivities =
  asyncHandler(
    async (
      req: AuthenticatedRequest,
      res: Response
    ) => {
      // Get authenticated user ID.
      const rawUserId =
        req.user?.id ??
        req.user?._id;

      const userId =
        rawUserId?.toString();

      if (
        !userId ||
        !mongoose.isValidObjectId(userId)
      ) {
        throw new ApiError(
          STATUS_CODES.UNAUTHORIZED,
          "Unauthorized. Please log in."
        );
      }

      // Only return the logged-in
      // user's activity history.
      const logs =
        await ActivityLog.find({
          userId,
        })
          .sort({
            createdAt: -1,
            _id: -1,
          })
          .limit(50)
          .lean();

      return res
        .status(STATUS_CODES.OK)
        .json({
          success: true,
          count: logs.length,
          data: logs,
        });
    }
  );
