
import mongoose, {
  Schema,
  type Document,
} from "mongoose";

// =====================================
// Types
// =====================================

export interface IImageFile {
  fileId: string;
  url: string;
  fileName: string;
  fileSize: number;
  width?: number;
  height?: number;
}

export interface IJobOptions {
  mode: "exact" | "fit" | "percentage" | "preset";
  width?: number;
  height?: number;
  percentage?: number;
  outputFormat: "jpeg" | "png" | "webp" | "avif";
  quality: number;
  maintainAspectRatio: boolean;
}

export interface IJob extends Document {
  userId: mongoose.Types.ObjectId;
  status:
    | "pending"
    | "processing"
    | "completed"
    | "failed";
  progress: number;
  inputFiles: IImageFile[];
  outputFiles: IImageFile[];
  options: IJobOptions;
  error?: {
    message?: string;
    code?: string;
  };
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// =====================================
// File Schema
// =====================================

const fileSubSchema = new Schema<IImageFile>(
  {
    fileId: {
      type: String,
      required: true,
      trim: true,
    },

    url: {
      type: String,
      required: true,
      trim: true,
    },

    fileName: {
      type: String,
      required: true,
      trim: true,
    },

    fileSize: {
      type: Number,
      required: true,
      min: 0,
    },

    width: {
      type: Number,
      min: 1,
    },

    height: {
      type: Number,
      min: 1,
    },
  },
  {
    _id: false,
  }
);

// =====================================
// Options Schema
// =====================================

const jobOptionsSchema = new Schema<IJobOptions>(
  {
    mode: {
      type: String,
      enum: [
        "exact",
        "fit",
        "percentage",
        "preset",
      ],
      required: true,
    },

    width: {
      type: Number,
      min: 1,
    },

    height: {
      type: Number,
      min: 1,
    },

    percentage: {
      type: Number,
      min: 1,
      max: 500,
    },

    outputFormat: {
      type: String,
      enum: [
        "jpeg",
        "png",
        "webp",
        "avif",
      ],
      default: "jpeg",
      required: true,
    },

    quality: {
      type: Number,
      min: 10,
      max: 100,
      default: 80,
    },

    maintainAspectRatio: {
      type: Boolean,
      default: true,
    },
  },
  {
    _id: false,
  }
);

// =====================================
// Job Schema
// =====================================

const jobSchema = new Schema<IJob>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    status: {
      type: String,
      enum: [
        "pending",
        "processing",
        "completed",
        "failed",
      ],
      default: "pending",
      required: true,
    },

    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    inputFiles: {
      type: [fileSubSchema],
      default: [],
    },

    outputFiles: {
      type: [fileSubSchema],
      default: [],
    },

    options: {
      type: jobOptionsSchema,
      required: true,
    },

    error: {
      message: String,
      code: String,
    },

    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    strict: true,
  }
);

// =====================================
// Indexes
// =====================================

// Fast user job history.
jobSchema.index({
  userId: 1,
  createdAt: -1,
});

// Fast filtering by status.
jobSchema.index({
  userId: 1,
  status: 1,
  createdAt: -1,
});

// =====================================
// Export Model
// =====================================

export const Job =
  mongoose.models.Job
    ? mongoose.model<IJob>("Job")
    : mongoose.model<IJob>(
        "Job",
        jobSchema
      );
