
import { z } from "zod";

const MAX_DIMENSION = 10000;
const MAX_TARGET_SIZE_MB = 100;
const DEFAULT_QUALITY = 90;

// =====================================
// Helpers
// =====================================

const optionalDimension = (field: string) =>
  z
    .union([z.string(), z.number()])
    .optional()
    .transform((value) => {
      if (value === undefined || value === "") {
        return undefined;
      }

      return Number(value);
    })
    .pipe(
      z
        .number()
        .int(`${field} must be an integer`)
        .min(1, `${field} must be at least 1`)
        .max(
          MAX_DIMENSION,
          `${field} cannot exceed ${MAX_DIMENSION}`
        )
        .optional()
    );

const optionalTargetSize = (
  field: string,
  maximum: number
) =>
  z
    .union([z.string(), z.number()])
    .optional()
    .transform((value) => {
      if (value === undefined || value === "") {
        return undefined;
      }

      return Number(value);
    })
    .pipe(
      z
        .number()
        .finite()
        .positive(`${field} must be greater than 0`)
        .max(
          maximum,
          `${field} exceeds the maximum allowed size`
        )
        .optional()
    );

const qualitySchema = z
  .union([z.string(), z.number()])
  .optional()
  .transform((value) => {
    if (value === undefined || value === "") {
      return DEFAULT_QUALITY;
    }

    return Number(value);
  })
  .pipe(
    z
      .number()
      .int("Quality must be an integer")
      .min(10, "Quality minimum is 10")
      .max(100, "Quality maximum is 100")
  );

const preserveResolutionSchema = z
  .union([
    z.boolean(),
    z.enum(["true", "false", "1", "0"]),
  ])
  .optional()
  .transform((value) => {
    if (value === undefined) {
      return true;
    }

    return (
      value === true ||
      value === "true" ||
      value === "1"
    );
  });

// =====================================
// Resize / Compress Image
// =====================================

export const resizeImageSchema = z.object({
  body: z.preprocess(
    (value) =>
      value === undefined ? {} : value,
    z
      .object({
        width: optionalDimension("Width"),

        height: optionalDimension("Height"),

        targetFileSizeKB: optionalTargetSize(
          "Target file size in KB",
          MAX_TARGET_SIZE_MB * 1024
        ),

        targetFileSizeMB: optionalTargetSize(
          "Target file size in MB",
          MAX_TARGET_SIZE_MB
        ),

        quality: qualitySchema,

        format: z
          .enum(["jpeg", "png", "webp", "avif"])
          .default("webp"),

        preserveResolution:
          preserveResolutionSchema,
      })
      .strict()
      .superRefine((data, ctx) => {
        if (
          data.targetFileSizeKB !== undefined &&
          data.targetFileSizeMB !== undefined
        ) {
          ctx.addIssue({
            code: "custom",
            path: ["targetFileSizeMB"],
            message:
              "Provide either targetFileSizeKB or targetFileSizeMB, not both",
          });
        }
      })
  ),
});
