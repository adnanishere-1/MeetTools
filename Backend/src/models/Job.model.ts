import mongoose, { Document, Schema } from 'mongoose';

export interface IImageFile {
  fileId: string;
  url: string;
  fileName: string;
  fileSize: number;
  width?: number;
  height?: number;
}

export interface IJob extends Document {
  userId?: mongoose.Types.ObjectId;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  inputFiles: IImageFile[];
  outputFiles?: IImageFile[];
  options: {
    mode: 'exact' | 'fit' | 'percentage' | 'preset';
    width?: number;
    height?: number;
    percentage?: number;
    outputFormat: 'jpeg' | 'png' | 'webp' | 'avif';
    quality: number;
    maintainAspectRatio: boolean;
  };
  error?: {
    message: string;
    code?: string;
  };
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const fileSubSchema = new Schema<IImageFile>(
  {
    fileId: { type: String, required: true },
    url: { type: String, required: true },
    fileName: { type: String, required: true },
    fileSize: { type: Number, required: true },
    width: Number,
    height: Number,
  },
  { _id: false }
);

const jobSchema = new Schema<IJob>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: false, index: true },
    status: { 
      type: String, 
      enum: ['pending', 'processing', 'completed', 'failed'], 
      default: 'pending',
      index: true 
    },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    inputFiles: [fileSubSchema],
    outputFiles: [fileSubSchema], // 👈 Resized image ki actual details yahan save hongi!
    options: {
      mode: { type: String, enum: ['exact', 'fit', 'percentage', 'preset'], required: true },
      width: Number,
      height: Number,
      percentage: Number,
      outputFormat: { type: String, enum: ['jpeg', 'png', 'webp', 'avif'], default: 'jpeg' },
      quality: { type: Number, min: 10, max: 100, default: 80 },
      maintainAspectRatio: { type: Boolean, default: true },
    },
    error: {
      message: String,
      code: String,
    },
    completedAt: Date,
  },
  { timestamps: true }
);

export const Job = mongoose.model<IJob>('Job', jobSchema);