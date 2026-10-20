import { z } from 'zod';

// MongoDB ObjectId format validation helper
const objectIdSchema = z.string().refine((val) => /^[0-9a-fA-F]{24}$/.test(val), {
  message: 'Invalid Job ID format',
});

// Single Image File structure schema
const imageFileSchema = z.object({
  fileId: z.string({ error: 'fileId is required' }),
  url: z.string({ error: 'url is required' }).url('Invalid image URL'),
  fileName: z.string({ error: 'fileName is required' }),
  fileSize: z.number({ error: 'fileSize is required' }).positive(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
});

// Create Job Request Body Validator
export const createJobSchema = z.object({
  body: z
    .object({
      inputFiles: z
        .array(imageFileSchema)
        .min(1, 'At least one input file is required'),
      options: z
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
        ),
    }),
});

// URL Param Validator for /:jobId
export const getJobByIdSchema = z.object({
  params: z.object({
    jobId: z.string({ error: 'Job ID is required' }),
  }),
});

// Pagination / Filter Query Params Validator for Job History
export const getUserJobsQuerySchema = z.object({
  query: z.object({
    page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
    limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 10)),
    status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
  }),
});