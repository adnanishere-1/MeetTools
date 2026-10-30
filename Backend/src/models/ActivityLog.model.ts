
import mongoose, {
  Schema,
  type Document,
} from "mongoose";

// =====================================
// Activity Types
// =====================================

export type ActivityAction =
  | "USER_REGISTER"
  | "USER_LOGIN"
  | "TOOL_USE"
  | "IMAGE_RESIZE"
  | "IMAGE_CLEAN"
  | "CREDIT_DEDUCT";

export interface IActivityLog extends Document {
  userId?: mongoose.Types.ObjectId | null;
  action: ActivityAction;
  details: Record<string, unknown>;
  ipAddress?: string;
  createdAt: Date;
}

// =====================================
// Activity Log Schema
// =====================================

const ActivityLogSchema =
  new Schema<IActivityLog>(
    {
      // Optional for guest tool activity.
      userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: false,
        default: null,
      },

      action: {
        type: String,
        required: true,
        enum: [
          "USER_REGISTER",
          "USER_LOGIN",
          "TOOL_USE",
          "IMAGE_RESIZE",
          "IMAGE_CLEAN",
          "CREDIT_DEDUCT",
        ],
      },

      details: {
        type: Schema.Types.Mixed,
        default: () => ({}),
      },

      ipAddress: {
        type: String,
        trim: true,
        maxlength: 45,
      },
    },
    {
      timestamps: {
        createdAt: true,
        updatedAt: false,
      },
      strict: true,
    }
  );

// =====================================
// Indexes
// =====================================

// Fast activity history for each user.
ActivityLogSchema.index(
  {
    userId: 1,
    createdAt: -1,
  },
  {
    name: "user_activity_created_at",
  }
);

// =====================================
// Model Export
// =====================================

export const ActivityLog =
  mongoose.models.ActivityLog
    ? mongoose.model<IActivityLog>(
        "ActivityLog"
      )
    : mongoose.model<IActivityLog>(
        "ActivityLog",
        ActivityLogSchema
      );
