import { z } from 'zod';

export const resizeImageSchema = z.object({
  body: z.object({
    width: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined))
      .pipe(z.number().positive().optional()),
    height: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined))
      .pipe(z.number().positive().optional()),
    
    // Target file size in KB or MB
    targetFileSizeKB: z
      .string()
      .optional()
      .transform((val) => (val ? parseFloat(val) : undefined))
      .pipe(z.number().positive().optional()),
    targetFileSizeMB: z
      .string()
      .optional()
      .transform((val) => (val ? parseFloat(val) : undefined))
      .pipe(z.number().positive().optional()),

    quality: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 85))
      .pipe(z.number().min(10).max(100)),
    
    format: z.enum(['jpeg', 'png', 'webp', 'avif']).optional().default('webp'),
    preserveResolution: z
      .string()
      .optional()
      .transform((val) => (val === undefined ? true : val === 'true' || val === '1')),
  }),
});