
/**
 * Image Enhancer shared types
 * MeetTools frontend
 */

/* ----------------------------------
   Enhancement settings
----------------------------------- */

export type EnhancementFormat =
  | "original"
  | "jpeg"
  | "png"
  | "webp";

export type EnhancementScale = 2 | 4;

export interface EnhancementSettings {
  scale: EnhancementScale;
  format: EnhancementFormat;
  quality: number;
}

/* ----------------------------------
   Image upload
----------------------------------- */

export interface ImageUploadProps {
  file: File | null;
  previewUrl: string | null;
  onFileSelect: (file: File | null) => void;
  disabled?: boolean;
}

/* ----------------------------------
   Enhancement job status
----------------------------------- */

export type ImageEnhancerStatusType =
  | "idle"
  | "uploading"
  | "queued"
  | "processing"
  | "completed"
  | "failed";

/* ----------------------------------
   Enhancement request
----------------------------------- */

export interface EnhanceImagePayload {
  image: File;
  scale: EnhancementScale;
  format: EnhancementFormat;
  quality: number;
}

/* ----------------------------------
   Enhancement result
----------------------------------- */

export interface EnhancementResultData {
  url: string;
  fileName?: string;
  format?: EnhancementFormat;
  width?: number;
  height?: number;
  size?: number;
}

/* ----------------------------------
   API response
----------------------------------- */

export interface EnhanceImageResponse {
  success: boolean;
  message?: string;
  data: {
    jobId: string;
    status: Exclude<
      ImageEnhancerStatusType,
      "idle" | "uploading"
    >;
  };
}

export interface ImageEnhancerJobResponse {
  success: boolean;
  data: {
    jobId: string;
    status: Exclude<
      ImageEnhancerStatusType,
      "idle" | "uploading"
    >;
    progress?: number;
    result?: EnhancementResultData;
    error?: string;
  };
}

/* ----------------------------------
   API error
----------------------------------- */

export interface ImageEnhancerErrorResponse {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
}

/* ----------------------------------
   Component props
----------------------------------- */

export interface EnhancementEditorProps {
  settings: EnhancementSettings;
  onSettingsChange: (
    settings: Partial<EnhancementSettings>
  ) => void;
  disabled?: boolean;
}

export interface BeforeAfterPreviewProps {
  originalUrl: string | null;
  enhancedUrl: string;
}

export interface ImageEnhancerStatusProps {
  status: ImageEnhancerStatusType;
  error?: string | null;
}

export interface EnhancementResultProps {
  result: EnhancementResultData;
}

/* ----------------------------------
   Hook return types
----------------------------------- */

export interface ImageEnhancerHookReturn {
  file: File | null;
  previewUrl: string | null;
  result: EnhancementResultData | null;
  settings: EnhancementSettings;
  status: ImageEnhancerStatusType;
  error: string | null;
  isLoading: boolean;

  setFile: (file: File | null) => void;

  updateSettings: (
    settings: Partial<EnhancementSettings>
  ) => void;

  enhanceImage: () => Promise<void>;
  reset: () => void;
}
