
import mongoose, {
  Schema,
  type Document,
} from "mongoose";

// =====================================
// Types
// =====================================

export type PresetMode =
  | "exact"
  | "fit"
  | "percentage"
  | "preset";

export type PresetOutputFormat =
  | "jpeg"
  | "png"
  | "webp"
  | "avif";

export interface IPresetOptions {
  mode: PresetMode;
  width?: number;
  height?: number;
  percentage?: number;
  outputFormat: PresetOutputFormat;
  quality: number;
  maintainAspectRatio: boolean;
}

export interface IPreset extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  options: IPresetOptions;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// =====================================
// Preset Options Schema
// =====================================

const presetOptionsSchema =
  new Schema<IPresetOptions>(
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
        max: 10000,
        validate: {
          validator: Number.isInteger,
          message: "Width must be an integer",
        },
      },

      height: {
        type: Number,
        min: 1,
        max: 10000,
        validate: {
          validator: Number.isInteger,
          message: "Height must be an integer",
        },
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
        required: true,
      },

      maintainAspectRatio: {
        type: Boolean,
        default: true,
        required: true,
      },
    },
    {
      _id: false,
      strict: true,
    }
  );

// =====================================
// Main Preset Schema
// =====================================

const presetSchema =
  new Schema<IPreset>(
    {
      userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,

        // index: true removed
        // because indexes are defined below.
      },

      name: {
        type: String,
        required: true,
        trim: true,
        minlength: 1,
        maxlength: 100,
      },

      description: {
        type: String,
        trim: true,
        maxlength: 500,
      },

      options: {
        type: presetOptionsSchema,
        required: true,
      },

      isDefault: {
        type: Boolean,
        default: false,
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

// Same user cannot have duplicate names.
presetSchema.index(
  {
    userId: 1,
    name: 1,
  },
  {
    unique: true,
    name: "unique_user_preset_name",
  }
);

// Only one default preset per user.
presetSchema.index(
  {
    userId: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      isDefault: true,
    },
    name: "unique_user_default_preset",
  }
);

// Faster listing of user presets.
presetSchema.index(
  {
    userId: 1,
    createdAt: -1,
  },
  {
    name: "user_presets_created_at",
  }
);

// =====================================
// Model Export
// =====================================

export const Preset =
  mongoose.models.Preset
    ? mongoose.model<IPreset>("Preset")
    : mongoose.model<IPreset>(
        "Preset",
        presetSchema
      );
