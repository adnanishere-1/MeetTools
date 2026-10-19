import dotenv from 'dotenv';
dotenv.config();
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().default('5000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGO_URI: z.string().min(1, 'MONGO_URI is required'),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().default('6379'),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  JWT_REFRESH_SECRET: z.string().min(1, 'JWT_REFRESH_SECRET is required'),
  IMAGEKIT_PUBLIC_KEY: z.string().min(1, 'IMAGEKIT_PUBLIC_KEY is required'),
  IMAGEKIT_PRIVATE_KEY: z.string().min(1, 'IMAGEKIT_PRIVATE_KEY is required'),
  IMAGEKIT_URL_ENDPOINT: z.string().url('IMAGEKIT_URL_ENDPOINT must be a valid URL'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables configuration:', JSON.stringify(parsedEnv.error.format(), null, 2));
  process.exit(1);
}

export const env = parsedEnv.data;