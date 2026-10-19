import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  role: 'user' | 'admin';
  isEmailVerified: boolean;
  avatar?: string;
  credits: number;
  otp?: string;
  otpExpiresAt?: Date;
  
  // Detailed Legal & Data Collection Consent
  consents: {
    essentialCookies: boolean;   // Functional & auth cookies (Always true)
    analyticsConsent: boolean;   // Usage tracking
    marketingConsent: boolean;   // Email updates / promotional
    termsAndPrivacyAccepted: boolean; // Privacy policy & Terms acceptance
    consentGivenAt?: Date;      // Timestamp of consent
    ipAddress?: string;         // IP address during consent (for audit trail)
  };

  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { 
      type: String, 
      required: true, 
      unique: true, 
      lowercase: true, 
      trim: true, 
      index: true 
    },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    isEmailVerified: { type: Boolean, default: false },
    avatar: { type: String },
    credits: { type: Number, default: 100 },
    otp: { type: String, select: false },
    otpExpiresAt: { type: Date, select: false },

    // Consent Tracking Schema
    consents: {
      essentialCookies: { type: Boolean, default: true },
      analyticsConsent: { type: Boolean, default: false },
      marketingConsent: { type: Boolean, default: false },
      termsAndPrivacyAccepted: { type: Boolean, default: false },
      consentGivenAt: { type: Date },
      ipAddress: { type: String },
    },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>('User', userSchema);