
import { z } from "zod";

// =====================================
// Constants
// =====================================

const MAX_DIMENSION = 10000;
const MAX_PAGE_SIZE = 100;
const MAX_INPUT_FILES = 20;

const ALLOWED_FORMATS = [
  "jpeg",
  "png",
  "webp",
  "avif",
] as const;

const JOB_STATUSES = [
  "pending",
  "processing",
  "completed",
  "failed",
] as const;

// =====================================
// MongoDB ObjectId Validation
// =====================================

const objectIdSchema = z
  .string()
  .regex(
    /^[0-9a-fA-F]{24}$/,
    "Invalid Job ID format"
  );

// =====================================
// Image File Metadata
// =====================================

const imageFileSchema = z
  .object({
    fileId: z
      .string()
      .trim()
      .min(1, "fileId is required")
      .max(255),

    url: z
      .string()
      .trim()
      .url("Invalid image URL")
      .refine(
        (value) => {
          try {
            const url = new URL(value);

            return (
              url.protocol === "https:"
            );
          } catch {
            return false;
          }
        },
        "Image URL must use HTTPS"
      ),

    fileName: z
      .string()
      .trim()
      .min(1, "fileName is required")
      .max(255),

    fileSize: z
      .number()
      .int("File size must be an integer")
      .positive(
        "File size must be greater than 0"
      ),

    width: z
      .number()
      .int("Width must be an integer")
      .positive()
      .max(MAX_DIMENSION)
      .optional(),

    height: z
      .number()
      .int("Height must be an integer")
      .positive()
      .max(MAX_DIMENSION)
      .optional(),
  })
  .strict();

// =====================================
// Processing Options
// =====================================

const jobOptionsSchema = z
  .object({
    mode: z.enum([
      "exact",
      "fit",
      "percentage",
      "preset",
    ]),

    width: z
      .number()
      .int("Width must be an integer")
      .min(1)
      .max(MAX_DIMENSION)
      .optional(),

    height: z
      .number()
      .int("Height must be an integer")
      .min(1)
      .max(MAX_DIMENSION)
      .optional(),

    percentage: z
      .number()
      .finite()
      .min(
        1,
        "Percentage must be at least 1%"
      )
      .max(
        1000,
        "Percentage cannot exceed 1000%"
      )
      .optional(),

    outputFormat: z
      .enum(ALLOWED_FORMATS)
      .default("jpeg"),

    quality: z
      .number()
      .int("Quality must be an integer")
      .min(
        10,
        "Quality minimum is 10"
      )
      .max(
        100,
        "Quality maximum is 100"
      )
      .default(80),

    maintainAspectRatio: z
      .boolean()
      .default(true),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (
      data.mode === "exact" ||
      data.mode === "fit"
    ) {
      if (
        data.width === undefined &&
        data.height === undefined
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["mode"],
          message:
            "Width or height is required for exact/fit mode",
        });
      }
    }

    if (
      data.mode === "percentage" &&
      data.percentage === undefined
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["percentage"],
        message:
          "Percentage is required for percentage mode",
      });
    }
  });

// =====================================
// Create Job
// =====================================

export const createJobSchema = z.object({
  body: z
    .object({
      inputFiles: z
        .array(imageFileSchema)
        .min(
          1,
          "At least one input file is required"
        )
        .max(
          MAX_INPUT_FILES,
          `Maximum ${MAX_INPUT_FILES} files are allowed`
        ),

      options: jobOptionsSchema,
    })
    .strict(),
});

// =====================================
// Get Job By ID
// =====================================

export const getJobByIdSchema = z.object({
  params: z
    .object({
      jobId: objectIdSchema,
    })
    .strict(),
});

// =====================================
// Job History Query
// =====================================

const pageSchema = z.coerce
  .number()
  .int("Page must be an integer")
  .min(1, "Page must be at least 1")
  .max(
    100000,
    "Page number is too large"
  )
  .default(1);

const limitSchema = z.coerce
  .number()
  .int("Limit must be an integer")
  .min(1, "Limit must be at least 1")
  .max(
    MAX_PAGE_SIZE,
    `Limit cannot exceed ${MAX_PAGE_SIZE}`
  )
  .default(10);

export const getUserJobsQuerySchema = z.object({
  query: z
    .object({
      page: pageSchema,

      limit: limitSchema,

      status: z
        .enum(JOB_STATUSES)
        .optional(),
    })
    .strict(),
});
