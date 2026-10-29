
import mongoose, {
  Schema,
  type Document,
} from "mongoose";

// =====================================
// Types
// =====================================

export interface IUserConsents {
  essentialCookies: boolean;
  analyticsConsent: boolean;
  marketingConsent: boolean;
  termsAndPrivacyAccepted: boolean;
  consentGivenAt?: Date;
  ipAddress?: string;
}

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  role: "user" | "admin";
  isEmailVerified: boolean;
  avatar?: string;
  credits: number;
  otp?: string;
  otpExpiresAt?: Date;
  consents: IUserConsents;
  createdAt: Date;
  updatedAt: Date;
}

// =====================================
// Consent Schema
// =====================================

const consentSchema = new Schema<IUserConsents>(
  {
    essentialCookies: {
      type: Boolean,
      default: true,
    },

    analyticsConsent: {
      type: Boolean,
      default: false,
    },

    marketingConsent: {
      type: Boolean,
      default: false,
    },

    termsAndPrivacyAccepted: {
      type: Boolean,
      default: false,
    },

    consentGivenAt: {
      type: Date,
    },

    ipAddress: {
      type: String,
      trim: true,
      maxlength: 45,
    },
  },
  {
    _id: false,
  }
);

// =====================================
// User Schema
// =====================================

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,

      // No index: true here.
      // unique: true already creates an index.
    },

    password: {
      type: String,
      required: [
        true,
        "Password is required",
      ],
      select: false,

      validate: {
        validator(value: string) {
          if (
            value.startsWith("$2a$") ||
            value.startsWith("$2b$") ||
            value.startsWith("$2y$")
          ) {
            return true;
          }

          return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(
            value
          );
        },

        message:
          "Password must contain at least 8 characters, uppercase, lowercase, number and special character.",
      },
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    avatar: {
      type: String,
      trim: true,
      maxlength: 2048,
    },

    credits: {
      type: Number,
      default: 100,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "Credits must be an integer",
      },
    },

    otp: {
      type: String,
      select: false,
    },

    otpExpiresAt: {
      type: Date,
      select: false,
    },

    consents: {
      type: consentSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
    strict: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.password;
        delete ret.otp;
        delete ret.otpExpiresAt;
        return ret;
      },
    },
  }
);

// =====================================
// Export Model
// =====================================

export const User =
  mongoose.models.User
    ? mongoose.model<IUser>("User")
    : mongoose.model<IUser>(
        "User",
        userSchema
      );
