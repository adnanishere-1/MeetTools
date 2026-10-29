
import { z } from "zod";

// =====================================
// Constants
// =====================================

const MAX_DIMENSION = 10000;

const objectIdSchema = z
  .string()
  .regex(
    /^[0-9a-fA-F]{24}$/,
    "Invalid preset ID"
  );

// =====================================
// Preset Options
// =====================================

const optionsSchema = z
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
      .min(1, "Width must be greater than 0")
      .max(
        MAX_DIMENSION,
        `Width cannot exceed ${MAX_DIMENSION}`
      )
      .optional(),

    height: z
      .number()
      .int("Height must be an integer")
      .min(1, "Height must be greater than 0")
      .max(
        MAX_DIMENSION,
        `Height cannot exceed ${MAX_DIMENSION}`
      )
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
      .enum([
        "jpeg",
        "png",
        "webp",
        "avif",
      ])
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
// Shared Fields
// =====================================

const presetNameSchema = z
  .string()
  .trim()
  .min(
    2,
    "Name must be at least 2 characters"
  )
  .max(
    100,
    "Name cannot exceed 100 characters"
  );

const descriptionSchema = z
  .string()
  .trim()
  .max(
    500,
    "Description cannot exceed 500 characters"
  )
  .optional();

// =====================================
// Create Preset
// =====================================

export const createPresetSchema = z.object({
  body: z
    .object({
      name: presetNameSchema,

      description:
        descriptionSchema,

      options:
        optionsSchema,

      isDefault: z
        .boolean()
        .default(false),
    })
    .strict(),
});

// =====================================
// Update Preset
// =====================================

export const updatePresetSchema = z.object({
  params: z.object({
    presetId: objectIdSchema,
  }),

  body: z
    .object({
      name:
        presetNameSchema.optional(),

      description:
        descriptionSchema,

      options:
        optionsSchema.optional(),

      isDefault:
        z.boolean().optional(),
    })
    .strict()
    .refine(
      (data) =>
        Object.keys(data).length > 0,
      {
        message:
          "At least one field is required to update the preset",
      }
    ),
});

// =====================================
// Preset ID Param
// =====================================

export const presetIdParamSchema = z.object({
  params: z.object({
    presetId: objectIdSchema,
  }),
});
