import { z } from 'zod';

export const getActivityLogsQuerySchema = z.object({
  query: z.object({
    page: z
      .string()
      .optional()
      .transform((val) => (val ? Math.max(1, parseInt(val, 10)) : 1)),
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? Math.min(100, Math.max(1, parseInt(val, 10))) : 50)),
    action: z
      .enum(['USER_REGISTER', 'USER_LOGIN', 'IMAGE_RESIZE', 'IMAGE_CLEAN', 'CREDIT_DEDUCT'])
      .optional(),
  }),
});