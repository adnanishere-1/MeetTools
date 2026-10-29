
import mongoose from "mongoose";

import { ActivityLog } from "../models/ActivityLog.model.js";
import { logger } from "./logger.js";

// =====================================
// Types
// =====================================

type ActivityAction =
  | "USER_REGISTER"
  | "USER_LOGIN"
  | "IMAGE_RESIZE"
  | "IMAGE_CLEAN"
  | "CREDIT_DEDUCT";

interface LogActivityParams {
  userId: string;
  action: ActivityAction;
  details?: Record<string, unknown>;
  ipAddress?: string;
}

// =====================================
// Sensitive Data Protection
// =====================================

const SENSITIVE_KEYS = new Set([
  "password",
  "confirmpassword",
  "currentpassword",
  "newpassword",
  "token",
  "accesstoken",
  "refreshtoken",
  "jwt",
  "authorization",
  "cookie",
  "cookies",
  "meettools_token",
  "otp",
  "otpcode",
  "verificationcode",
  "secret",
  "apikey",
  "privatekey",
]);

function sanitizeDetails(
  value: unknown,
  depth = 0
): unknown {
  // Avoid deeply nested objects.
  if (depth > 5) {
    return "[MAX_DEPTH]";
  }

  if (Array.isArray(value)) {
    return value
      .slice(0, 50)
      .map((item) =>
        sanitizeDetails(item, depth + 1)
      );
  }

  if (
    value !== null &&
    typeof value === "object"
  ) {
    const sanitized:
      Record<string, unknown> = {};

    for (const [key, item] of Object.entries(value)) {
      const normalizedKey = key
        .replace(/[-_\s]/g, "")
        .toLowerCase();

      if (
        SENSITIVE_KEYS.has(key.toLowerCase()) ||
        SENSITIVE_KEYS.has(normalizedKey)
      ) {
        sanitized[key] = "[REDACTED]";
        continue;
      }

      sanitized[key] =
        sanitizeDetails(item, depth + 1);
    }

    return sanitized;
  }

  if (
    typeof value === "string"
  ) {
    // Limit stored string size.
    return value.slice(0, 2000);
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null
  ) {
    return value;
  }

  return undefined;
}

// =====================================
// Activity Logger
// =====================================

export const logActivity = async ({
  userId,
  action,
  details = {},
  ipAddress,
}: LogActivityParams): Promise<void> => {
  try {
    // Validate MongoDB user ID.
    if (
      !userId ||
      !mongoose.isValidObjectId(userId)
    ) {
      logger.warn(
        "⚠️ Activity log skipped: invalid userId"
      );
      return;
    }

    // Sanitize details before saving.
    const safeDetails =
      sanitizeDetails(details) as Record<string, unknown>;

    const safeIpAddress =
      typeof ipAddress === "string" &&
      ipAddress.trim()
        ? ipAddress.trim().slice(0, 45)
        : undefined;

    await ActivityLog.create({
      userId,
      action,
      details: safeDetails,
      ipAddress: safeIpAddress,
    });
  } catch (error: unknown) {
    // Activity logging must not break
    // the main user request.
    logger.error(
      {
        err: error,
        action,
      },
      "❌ Failed to create activity log"
    );
  }
};
