import { z } from 'zod';

const optionsSchema = z
  .object({
    mode: z.enum(['exact', 'fit', 'percentage', 'preset'], {
      error: 'Mode is required',
    }),
    width: z.number().positive('Width must be greater than 0').optional(),
    height: z.number().positive('Height must be greater than 0').optional(),
    percentage: z
      .number()
      .min(1, 'Percentage must be at least 1%')
      .max(1000, 'Percentage cannot exceed 1000%')
      .optional(),
    outputFormat: z.enum(['jpeg', 'png', 'webp', 'avif']).default('jpeg'),
    quality: z
      .number()
      .min(10, 'Quality minimum is 10')
      .max(100, 'Quality maximum is 100')
      .default(80),
    maintainAspectRatio: z.boolean().default(true),
  })
  .refine(
    (data) => {
      if (data.mode === 'exact' || data.mode === 'fit') {
        return data.width !== undefined || data.height !== undefined;
      }
      if (data.mode === 'percentage') {
        return data.percentage !== undefined;
      }
      return true;
    },
    {
      message:
        'Width/Height is required for exact/fit mode, and percentage is required for percentage mode',
      path: ['mode'],
    }
  );

export const createPresetSchema = z.object({
  body: z.object({
    name: z
      .string({ error: 'Preset name is required' })
      .min(2, 'Name must be at least 2 characters')
      .trim(),
    description: z.string().trim().optional(),
    options: optionsSchema,
    isDefault: z.boolean().optional().default(false),
  }),
});

export const updatePresetSchema = z.object({
  params: z.object({
    presetId: z.string({ error: 'Preset ID is required' }),
  }),
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').trim().optional(),
    description: z.string().trim().optional(),
    options: optionsSchema.optional(),
    isDefault: z.boolean().optional(),
  }),
});

export const presetIdParamSchema = z.object({
  params: z.object({
    presetId: z.string({ error: 'Preset ID is required' }),
  }),
});