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
  
  consents: {
    essentialCookies: boolean;
    analyticsConsent: boolean;
    marketingConsent: boolean;
    termsAndPrivacyAccepted: boolean;
    consentGivenAt?: Date;
    ipAddress?: string;
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
    password: { 
      type: String, 
      required: [true, 'Password is required'], 
      select: false,
      validate: {
        validator: function (value: string) {
          // Skip validation if the password is already hashed (e.g., bcrypt hashes start with $2a$, $2b$, or $2y$)
          if (value.startsWith('$2a$') || value.startsWith('$2b$') || value.startsWith('$2y$')) {
            return true;
          }
          // Validate plain-text password before hashing
          return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(value);
        },
        message: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
      },
    },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    isEmailVerified: { type: Boolean, default: false },
    avatar: { type: String },
    credits: { type: Number, default: 100 },
    otp: { type: String, select: false },
    otpExpiresAt: { type: Date, select: false },

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