
import { z } from "zod";

// =====================================
// Constants
// =====================================

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;

const MAX_PAGE = 100000;
const MAX_LIMIT = 100;

// =====================================
// Query Integer Validation
// =====================================

const positiveQueryInteger = (
  defaultValue: number,
  maximum: number,
  fieldName: string
) =>
  z
    .string()
    .regex(
      /^[1-9]\d*$/,
      `${fieldName} must be a positive integer`
    )
    .optional()
    .transform((value) =>
      value === undefined
        ? defaultValue
        : Number(value)
    )
    .pipe(
      z
        .number()
        .int(
          `${fieldName} must be an integer`
        )
        .min(
          1,
          `${fieldName} must be at least 1`
        )
        .max(
          maximum,
          `${fieldName} cannot exceed ${maximum}`
        )
    );

// =====================================
// Activity Actions
// =====================================

const activityActionSchema = z.enum([
  "USER_REGISTER",
  "USER_LOGIN",
  "IMAGE_RESIZE",
  "IMAGE_CLEAN",
  "CREDIT_DEDUCT",
]);

// =====================================
// Get Activity Logs Query
// =====================================

export const getActivityLogsQuerySchema =
  z.object({
    query: z
      .object({
        page: positiveQueryInteger(
          DEFAULT_PAGE,
          MAX_PAGE,
          "Page"
        ),

        limit: positiveQueryInteger(
          DEFAULT_LIMIT,
          MAX_LIMIT,
          "Limit"
        ),

        action:
          activityActionSchema.optional(),
      })
      .strict(),
  });
