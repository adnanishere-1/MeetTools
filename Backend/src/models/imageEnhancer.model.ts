
import {
  Schema,
  model,
  models,
  type HydratedDocument,
  type Model,
} from "mongoose";

/**
 * Job lifecycle states.
 */
export enum ImageEnhancerJobStatus {
  QUEUED = "queued",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
}

/**
 * Who requested the enhancement.
 */
export enum ImageEnhancerActorType {
  USER = "user",
  GUEST = "guest",
}

/**
 * Daily quota configuration.
 */
export const IMAGE_ENHANCER_DAILY_LIMIT = 30;

/**
 * Image metadata saved with the job.
 */
export interface ImageEnhancerImageMetadata {
  originalName: string;
  mimeType: string;
  format: string;
  size: number;
  width: number;
  height: number;

  /**
   * ImageKit original file reference.
   */
  fileId: string;

  /**
   * ImageKit original image URL.
   */
  url: string;
}

/**
 * Enhancement job document.
 */
export interface ImageEnhancerJob {
  jobId: string;

  actorType: ImageEnhancerActorType;
  actorId: string;

  status: ImageEnhancerJobStatus;

  input: ImageEnhancerImageMetadata;

  output?: {
    /**
     * ImageKit enhanced file reference.
     */
    fileId: string;

    /**
     * ImageKit enhanced image URL.
     */
    url: string;

    format: string;
    size: number;
    width: number;
    height: number;
  };

  error?: {
    code: string;
    message: string;
  };

  /**
   * BullMQ job ID.
   */
  queueJobId?: string;

  /**
   * UTC date key, e.g. 2026-11-10.
   */
  quotaDate: string;

  /**
   * Prevents duplicate quota refunds.
   */
  quotaRefundedAt?: Date;

  /**
   * Job expiration date.
   */
  expiresAt: Date;

  startedAt?: Date;
  completedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export type ImageEnhancerJobDocument =
  HydratedDocument<ImageEnhancerJob>;

/**
 * Image metadata schema.
 */
const imageMetadataSchema =
  new Schema<ImageEnhancerImageMetadata>(
    {
      originalName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 255,
      },

      mimeType: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100,
      },

      format: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        maxlength: 20,
      },

      size: {
        type: Number,
        required: true,
        min: 1,
      },

      width: {
        type: Number,
        required: true,
        min: 1,
      },

      height: {
        type: Number,
        required: true,
        min: 1,
      },

      fileId: {
        type: String,
        required: true,
        trim: true,
        maxlength: 255,
      },

      url: {
        type: String,
        required: true,
        trim: true,
        maxlength: 2048,
      },
    },
    {
      _id: false,
      id: false,
    },
  );

/**
 * Main image enhancer job schema.
 */
const imageEnhancerJobSchema =
  new Schema<ImageEnhancerJob>(
    {
      jobId: {
        type: String,
        required: true,
        immutable: true,
      },

      actorType: {
        type: String,
        enum: Object.values(ImageEnhancerActorType),
        required: true,
        immutable: true,
      },

      /**
       * For users: authenticated user ID.
       * For guests: server-generated HMAC of normalized IP.
       *
       * Never store raw IP addresses in this field.
       */
      actorId: {
        type: String,
        required: true,
        immutable: true,
        maxlength: 128,
      },

      status: {
        type: String,
        enum: Object.values(ImageEnhancerJobStatus),
        required: true,
        default: ImageEnhancerJobStatus.QUEUED,
        index: true,
      },

      input: {
        type: imageMetadataSchema,
        required: true,
      },

      output: {
        fileId: {
          type: String,
          trim: true,
          maxlength: 255,
        },

        url: {
          type: String,
          trim: true,
          maxlength: 2048,
        },

        format: {
          type: String,
          trim: true,
          lowercase: true,
          maxlength: 20,
        },

        size: {
          type: Number,
          min: 1,
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

      error: {
        code: {
          type: String,
          trim: true,
          maxlength: 100,
        },

        message: {
          type: String,
          trim: true,
          maxlength: 500,
        },
      },

      queueJobId: {
        type: String,
        trim: true,
        maxlength: 255,
      },

      quotaDate: {
        type: String,
        required: true,
        immutable: true,
        match: /^\d{4}-\d{2}-\d{2}$/,
      },

      quotaRefundedAt: {
        type: Date,
      },

      expiresAt: {
        type: Date,
        required: true,
        index: true,
      },

      startedAt: {
        type: Date,
      },

      completedAt: {
        type: Date,
      },
    },
    {
      timestamps: true,
      versionKey: false,
      strict: "throw",
      minimize: true,
    },
  );

/**
 * A job ID must be unique.
 */
imageEnhancerJobSchema.index(
  { jobId: 1 },
  {
    unique: true,
    name: "image_enhancer_job_id_unique",
  },
);

/**
 * Useful for finding a user's or guest's jobs.
 */
imageEnhancerJobSchema.index(
  { actorType: 1, actorId: 1, createdAt: -1 },
  {
    name: "image_enhancer_actor_jobs",
  },
);

/**
 * Useful for worker/admin cleanup queries.
 */
imageEnhancerJobSchema.index(
  { status: 1, createdAt: 1 },
  {
    name: "image_enhancer_status_created",
  },
);

/**
 * MongoDB automatically deletes expired documents.
 * This is eventual cleanup, not an exact-time scheduler.
 */
imageEnhancerJobSchema.index(
  { expiresAt: 1 },
  {
    expireAfterSeconds: 0,
    name: "image_enhancer_job_ttl",
  },
);

export const ImageEnhancerJobModel: Model<ImageEnhancerJob> =
  (models.ImageEnhancerJob as Model<ImageEnhancerJob>) ||
  model<ImageEnhancerJob>(
    "ImageEnhancerJob",
    imageEnhancerJobSchema,
  );

/**
 * Daily usage document.
 *
 * One record per actor per UTC day.
 */
export interface ImageEnhancerDailyUsage {
  actorType: ImageEnhancerActorType;
  actorId: string;
  date: string;

  used: number;
  limit: number;

  createdAt: Date;
  updatedAt: Date;
}

export type ImageEnhancerDailyUsageDocument =
  HydratedDocument<ImageEnhancerDailyUsage>;

/**
 * Daily usage schema.
 */
const imageEnhancerDailyUsageSchema =
  new Schema<ImageEnhancerDailyUsage>(
    {
      actorType: {
        type: String,
        enum: Object.values(ImageEnhancerActorType),
        required: true,
        immutable: true,
      },

      actorId: {
        type: String,
        required: true,
        immutable: true,
        maxlength: 128,
      },

      date: {
        type: String,
        required: true,
        immutable: true,
        match: /^\d{4}-\d{2}-\d{2}$/,
      },

      used: {
        type: Number,
        required: true,
        default: 0,
        min: 0,
        validate: {
          validator: Number.isInteger,
          message: "Usage count must be an integer.",
        },
      },

      limit: {
        type: Number,
        required: true,
        default: IMAGE_ENHANCER_DAILY_LIMIT,
        min: 1,
        validate: {
          validator: Number.isInteger,
          message: "Daily limit must be an integer.",
        },
      },
    },
    {
      timestamps: true,
      versionKey: false,
      strict: "throw",
    },
  );

/**
 * Guarantees one daily usage document per actor.
 */
imageEnhancerDailyUsageSchema.index(
  { actorType: 1, actorId: 1, date: 1 },
  {
    unique: true,
    name: "image_enhancer_daily_usage_unique",
  },
);

export const ImageEnhancerDailyUsageModel: Model<ImageEnhancerDailyUsage> =
  (models.ImageEnhancerDailyUsage as Model<ImageEnhancerDailyUsage>) ||
  model<ImageEnhancerDailyUsage>(
    "ImageEnhancerDailyUsage",
    imageEnhancerDailyUsageSchema,
  );
