
import { z } from "zod";

/**
 * Upload constraints.
 */
export const IMAGE_ENHANCER_LIMITS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024,
  MAX_WIDTH: 12000,
  MAX_HEIGHT: 12000,
  MAX_PIXELS: 40_000_000,
} as const;

/**
 * Allowed image formats.
 */
export const ALLOWED_IMAGE_FORMATS = [
  "jpeg",
  "jpg",
  "png",
  "webp",
  "tiff",
] as const;

/**
 * Enhancement mode.
 */
export const enhancementModeSchema = z.enum([
  "auto",
  "manual",
]);

/**
 * Converts multipart numeric strings into numbers.
 */
const formNumber = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => {
    if (
      typeof value === "string" &&
      value.trim() !== ""
    ) {
      return Number(value);
    }

    return value;
  }, schema);

/**
 * Converts multipart boolean strings safely.
 */
const formBoolean = (defaultValue: boolean) =>
  z.preprocess(
    (value) => {
      if (value === "true") return true;
      if (value === "false") return false;

      return value;
    },
    z.boolean().default(defaultValue)
  );

/**
 * Enhancement options.
 */
export const imageEnhancementOptionsSchema = z
  .object({
    mode: enhancementModeSchema.default("auto"),

    brightness: formNumber(
      z.number().min(-100).max(100).default(0)
    ),

    contrast: formNumber(
      z.number().min(-100).max(100).default(0)
    ),

    saturation: formNumber(
      z.number().min(-100).max(100).default(0)
    ),

    sharpness: formNumber(
      z.number().min(0).max(100).default(30)
    ),

    noiseReduction: formNumber(
      z.number().min(0).max(100).default(20)
    ),

    autoExposure: formBoolean(true),

    autoContrast: formBoolean(true),

    autoColorCorrection: formBoolean(true),

    outputFormat: z
      .enum(["webp", "jpeg", "png"])
      .default("webp"),

    outputQuality: formNumber(
      z.number().int().min(60).max(95).default(85)
    ),
  })
  .strict()
  .superRefine((options, ctx) => {
    if (options.mode === "auto") {
      const manualValues = [
        options.brightness,
        options.contrast,
        options.saturation,
      ];

      if (manualValues.some((value) => value !== 0)) {
        ctx.addIssue({
          code: "custom",
          path: ["mode"],
          message:
            "Manual brightness, contrast and saturation require manual mode.",
        });
      }
    }
  });

/**
 * Upload metadata schema.
 */
export const imageMetadataSchema = z
  .object({
    originalName: z.string().trim().min(1).max(255),

    mimeType: z.enum([
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/tiff",
    ]),

    format: z.enum(ALLOWED_IMAGE_FORMATS),

    size: z
      .number()
      .int()
      .positive()
      .max(IMAGE_ENHANCER_LIMITS.MAX_FILE_SIZE),

    width: z
      .number()
      .int()
      .positive()
      .max(IMAGE_ENHANCER_LIMITS.MAX_WIDTH),

    height: z
      .number()
      .int()
      .positive()
      .max(IMAGE_ENHANCER_LIMITS.MAX_HEIGHT),
  })
  .strict()
  .superRefine((metadata, ctx) => {
    const totalPixels = metadata.width * metadata.height;

    if (totalPixels > IMAGE_ENHANCER_LIMITS.MAX_PIXELS) {
      ctx.addIssue({
        code: "custom",
        path: ["width"],
        message: "Image exceeds the maximum pixel limit.",
      });
    }

    const expectedMimeTypes: Record<string, string> = {
      jpeg: "image/jpeg",
      jpg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      tiff: "image/tiff",
    };

    if (
      expectedMimeTypes[metadata.format] !== metadata.mimeType
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["mimeType"],
        message: "Image format and MIME type do not match.",
      });
    }
  });

/**
 * Individual job ID validation.
 */
export const imageEnhancerJobIdSchema = z
  .string()
  .uuid("Invalid image enhancement job ID.");

/**
 * Express route params validation.
 *
 * req.params is an object containing jobId.
 */
export const imageEnhancerParamsSchema = z
  .object({
    jobId: imageEnhancerJobIdSchema,
  })
  .strict();

/**
 * Query parameters.
 */
export const imageEnhancerQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(10000).default(1),

    limit: z.coerce.number().int().min(1).max(50).default(10),
  })
  .strict();

/**
 * Export inferred TypeScript types.
 */
export type ImageEnhancementOptions = z.infer<
  typeof imageEnhancementOptionsSchema
>;

export type ValidatedImageMetadata = z.infer<
  typeof imageMetadataSchema
>;

export type ImageEnhancerQuery = z.infer<
  typeof imageEnhancerQuerySchema
>;

export type ImageEnhancerParams = z.infer<
  typeof imageEnhancerParamsSchema
>;
