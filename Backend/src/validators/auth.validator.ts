import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    name: z
      .string({ message: 'Name is required' })
      .min(2, 'Name must be at least 2 characters')
      .trim(),
    email: z
      .string({ message: 'Email is required' })
      .email('Invalid email address')
      .trim()
      .toLowerCase(),
    password: z
      .string({ message: 'Password is required' })
      .min(8, 'Password must be at least 8 characters long')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    adminSecretKey: z.string().optional(),
    termsAndPrivacyAccepted: z.boolean().optional(),
    essentialCookies: z.boolean().optional(),
    analyticsConsent: z.boolean().optional(),
    marketingConsent: z.boolean().optional(),
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
      .string({ message: 'Email is required' })
      .email('Invalid email address')
      .trim()
      .toLowerCase(),
    otp: z
      .string({ message: 'OTP is required' })
      .length(6, 'OTP must be exactly 6 digits'),
  }),
});

export const resendOTPSchema = z.object({
  body: z.object({
    email: z
      .string({ message: 'Email is required' })
      .email('Invalid email address')
      .trim()
      .toLowerCase(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z
      .string({ message: 'Email is required' })
      .email('Invalid email address')
      .trim()
      .toLowerCase(),
    password: z
      .string({ message: 'Password is required' }),
  }),
});