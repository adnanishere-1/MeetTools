
import mongoose from "mongoose";

import type {
  Request,
  Response,
} from "express";

import { Preset } from "../models/Preset.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { STATUS_CODES } from "../utils/statusCodes.js";

// =====================================
// Helpers
// =====================================

type AuthenticatedRequest = Request & {
  user?: {
    id: string;
  };
};

const getAuthenticatedUserId = (
  req: AuthenticatedRequest
): string => {
  const userId = req.user?.id;

  if (
    !userId ||
    !mongoose.isValidObjectId(userId)
  ) {
    throw new ApiError(
      STATUS_CODES.UNAUTHORIZED,
      "Not authorized, user ID missing"
    );
  }

  return userId;
};

const isDuplicateKeyError = (
  error: unknown
): boolean => {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
};

// =====================================
// Create Preset
// POST /api/v1/presets
// =====================================

export const createPreset = asyncHandler(
  async (
    req: AuthenticatedRequest,
    res: Response
  ) => {
    const userId = getAuthenticatedUserId(req);

    const {
      name,
      description,
      options,
      isDefault,
    } = req.body;

    const shouldBeDefault =
      isDefault === true;

    try {
      let preset;

      if (shouldBeDefault) {
        // A transaction prevents losing the old
        // default if the new preset cannot be saved.
        const session =
          await mongoose.startSession();

        try {
          await session.withTransaction(
            async () => {
              await Preset.updateMany(
                {
                  userId,
                  isDefault: true,
                },
                {
                  $set: {
                    isDefault: false,
                  },
                },
                { session }
              );

              const created =
                await Preset.create(
                  [
                    {
                      userId,
                      name,
                      description,
                      options,
                      isDefault: true,
                    },
                  ],
                  { session }
                );

              preset = created[0];
            }
          );
        } finally {
          await session.endSession();
        }
      } else {
        preset = await Preset.create({
          userId,
          name,
          description,
          options,
          isDefault: false,
        });
      }

      return res
        .status(STATUS_CODES.CREATED)
        .json({
          success: true,
          message:
            "Preset created successfully",
          preset,
        });
    } catch (error: unknown) {
      if (isDuplicateKeyError(error)) {
        throw new ApiError(
          STATUS_CODES.CONFLICT,
          "A preset with this name or default setting already exists"
        );
      }

      throw error;
    }
  }
);

// =====================================
// Get User Presets
// GET /api/v1/presets
// =====================================

export const getUserPresets = asyncHandler(
  async (
    req: AuthenticatedRequest,
    res: Response
  ) => {
    const userId = getAuthenticatedUserId(req);

    const presets = await Preset.find({
      userId,
    })
      .sort({
        createdAt: -1,
      })
      .lean();

    return res
      .status(STATUS_CODES.OK)
      .json({
        success: true,
        count: presets.length,
        presets,
      });
  }
);

// =====================================
// Delete Preset
// DELETE /api/v1/presets/:presetId
// =====================================

export const deletePreset = asyncHandler(
  async (
    req: AuthenticatedRequest,
    res: Response
  ) => {
    const userId = getAuthenticatedUserId(req);

    const presetId = req.params.presetId;

    if (
      !presetId ||
      !mongoose.isValidObjectId(presetId)
    ) {
      throw new ApiError(
        STATUS_CODES.BAD_REQUEST,
        "Invalid preset ID"
      );
    }

    const preset =
      await Preset.findOneAndDelete({
        _id: presetId,
        userId,
      });

    if (!preset) {
      throw new ApiError(
        STATUS_CODES.NOT_FOUND,
        "Preset not found"
      );
    }

    return res
      .status(STATUS_CODES.OK)
      .json({
        success: true,
        message:
          "Preset deleted successfully",
      });
  }
);
