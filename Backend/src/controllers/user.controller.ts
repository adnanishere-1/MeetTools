
import mongoose from "mongoose";

import type {
  Request,
  Response,
} from "express";

import { User } from "../models/User.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { STATUS_CODES } from "../utils/statusCodes.js";

// =====================================
// Types & Helpers
// =====================================

type AuthenticatedRequest = Request & {
  user?: {
    id: string;
  };
};

const getUserId = (
  req: AuthenticatedRequest
): string => {
  const userId = req.user?.id;

  if (
    !userId ||
    !mongoose.isValidObjectId(userId)
  ) {
    throw new ApiError(
      STATUS_CODES.UNAUTHORIZED,
      "Unauthorized. Please log in."
    );
  }

  return userId;
};

const safeUserFields =
  "name email role isEmailVerified avatar credits consents createdAt updatedAt";

// =====================================
// Get Current User Profile
// GET /api/v1/users/me
// =====================================

export const getProfile = asyncHandler(
  async (
    req: AuthenticatedRequest,
    res: Response
  ) => {
    const userId = getUserId(req);

    const user = await User.findById(
      userId
    )
      .select(safeUserFields)
      .lean();

    if (!user) {
      throw new ApiError(
        STATUS_CODES.NOT_FOUND,
        "User not found"
      );
    }

    return res
      .status(STATUS_CODES.OK)
      .json({
        success: true,
        user,
      });
  }
);

// =====================================
// Update User Profile
// PUT /api/v1/users/me
// =====================================

export const updateProfile = asyncHandler(
  async (
    req: AuthenticatedRequest,
    res: Response
  ) => {
    const userId = getUserId(req);

    const { name, avatar } =
      req.body ?? {};

    if (
      name === undefined &&
      avatar === undefined
    ) {
      throw new ApiError(
        STATUS_CODES.BAD_REQUEST,
        "Provide name or avatar to update"
      );
    }

    if (
      name !== undefined &&
      (
        typeof name !== "string" ||
        name.trim().length < 2 ||
        name.trim().length > 100
      )
    ) {
      throw new ApiError(
        STATUS_CODES.BAD_REQUEST,
        "Name must contain 2 to 100 characters"
      );
    }

    if (
      avatar !== undefined &&
      avatar !== null &&
      (
        typeof avatar !== "string" ||
        avatar.length > 2048 ||
        !/^https?:\/\//i.test(avatar)
      )
    ) {
      throw new ApiError(
        STATUS_CODES.BAD_REQUEST,
        "Avatar must be a valid HTTP(S) URL or null"
      );
    }

    const updates: {
      name?: string;
      avatar?: string | null;
    } = {};

    if (name !== undefined) {
      updates.name = name.trim();
    }

    if (avatar !== undefined) {
      updates.avatar = avatar;
    }

    const user =
      await User.findByIdAndUpdate(
        userId,
        {
          $set: updates,
        },
        {
          new: true,
          runValidators: true,
        }
      ).select(safeUserFields);

    if (!user) {
      throw new ApiError(
        STATUS_CODES.NOT_FOUND,
        "User not found"
      );
    }

    return res
      .status(STATUS_CODES.OK)
      .json({
        success: true,
        message:
          "Profile updated successfully",
        user,
      });
  }
);

// =====================================
// Get User Remaining Credits
// GET /api/v1/users/credits
// =====================================

export const getUserCredits = asyncHandler(
  async (
    req: AuthenticatedRequest,
    res: Response
  ) => {
    const userId = getUserId(req);

    const user = await User.findById(
      userId
    )
      .select("credits")
      .lean();

    if (!user) {
      throw new ApiError(
        STATUS_CODES.NOT_FOUND,
        "User not found"
      );
    }

    return res
      .status(STATUS_CODES.OK)
      .json({
        success: true,
        credits: user.credits,
      });
  }
);

// =====================================
// Update Cookie Consent
// PUT /api/v1/users/cookie-consent
// =====================================

export const updateCookieConsent =
  asyncHandler(
    async (
      req: AuthenticatedRequest,
      res: Response
    ) => {
      const userId = getUserId(req);

      const { consent } =
        req.body ?? {};

      if (
        consent !== "accepted" &&
        consent !== "rejected"
      ) {
        throw new ApiError(
          STATUS_CODES.BAD_REQUEST,
          "Consent must be accepted or rejected"
        );
      }

      const accepted =
        consent === "accepted";

      const user =
        await User.findByIdAndUpdate(
          userId,
          {
            $set: {
              "consents.essentialCookies": true,
              "consents.analyticsConsent": accepted,
              "consents.marketingConsent": accepted,
              "consents.consentGivenAt": new Date(),
              ...(req.ip
                ? {
                    "consents.ipAddress":
                      req.ip,
                  }
                : {}),
            },
          },
          {
            new: true,
            runValidators: true,
          }
        ).select("consents");

      if (!user) {
        throw new ApiError(
          STATUS_CODES.NOT_FOUND,
          "User not found"
        );
      }

      return res
        .status(STATUS_CODES.OK)
        .json({
          success: true,
          message:
            "Cookie consent updated successfully",
          consents: user.consents,
        });
    }
  );
