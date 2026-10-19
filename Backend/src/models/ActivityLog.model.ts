import mongoose, { Schema, Document } from 'mongoose';

export interface IActivityLog extends Document {
  userId: mongoose.Types.ObjectId;
  action: 'USER_REGISTER' | 'USER_LOGIN' | 'IMAGE_RESIZE' | 'IMAGE_CLEAN' | 'CREDIT_DEDUCT';
  details: Record<string, any>;
  ipAddress?: string;
  createdAt: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      enum: ['USER_REGISTER', 'USER_LOGIN', 'IMAGE_RESIZE', 'IMAGE_CLEAN', 'CREDIT_DEDUCT'],
    },
    details: {
      type: Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export const ActivityLog = mongoose.model<IActivityLog>('ActivityLog', ActivityLogSchema);