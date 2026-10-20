import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    name: z
      .string({ error: 'Name is required' })
      .min(2, 'Name must be at least 2 characters')
      .trim(),
    email: z
      .string({ error: 'Email is required' })
      .email('Invalid email address')
      .trim()
      .toLowerCase(),
    password: z
      .string({ error: 'Password is required' })
      .min(6, 'Password must be at least 6 characters long'),
    consents: z
      .object({
        analyticsConsent: z.boolean().optional(),
        marketingConsent: z.boolean().optional(),
        termsAndPrivacyAccepted: z.boolean().refine((val) => val === true, {
          message: 'You must accept the terms and privacy policy',
        }),
      })
      .optional(),
  }),
});

export const verifyOTPSchema = z.object({
  body: z.object({
    email: z
      .string({ error: 'Email is required' })
      .email('Invalid email address')
      .trim()
      .toLowerCase(),
    otp: z
      .string({ error: 'OTP is required' })
      .length(6, 'OTP must be exactly 6 digits'),
  }),
});

export const resendOTPSchema = z.object({
  body: z.object({
    email: z
      .string({ error: 'Email is required' })
      .email('Invalid email address')
      .trim()
      .toLowerCase(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z
      .string({ error: 'Email is required' })
      .email('Invalid email address')
      .trim()
      .toLowerCase(),
    password: z
      .string({ error: 'Password is required' }),
  }),
});