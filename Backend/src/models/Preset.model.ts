import mongoose, { Document, Schema } from 'mongoose';

export interface IPreset extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  options: {
    mode: 'exact' | 'fit' | 'percentage' | 'preset';
    width?: number;
    height?: number;
    percentage?: number;
    outputFormat: 'jpeg' | 'png' | 'webp' | 'avif';
    quality: number;
    maintainAspectRatio: boolean;
  };
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const presetSchema = new Schema<IPreset>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    options: {
      mode: { type: String, enum: ['exact', 'fit', 'percentage', 'preset'], required: true },
      width: Number,
      height: Number,
      percentage: Number,
      outputFormat: { type: String, enum: ['jpeg', 'png', 'webp', 'avif'], default: 'jpeg' },
      quality: { type: Number, min: 10, max: 100, default: 80 },
      maintainAspectRatio: { type: Boolean, default: true },
    },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Preset = mongoose.model<IPreset>('Preset', presetSchema);