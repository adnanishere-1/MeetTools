
import type {
  EnhancementFormat,
  ImageEnhancerStatusType,
} from "@/image types/imageEnhancer.types";

/* ----------------------------------
   Constants
----------------------------------- */

export const IMAGE_ENHANCER_LIMITS = {
  maxFileSize: 10 * 1024 * 1024,
  allowedMimeTypes: [
    "image/jpeg",
    "image/png",
    "image/webp",
  ] as const,
  minQuality: 50,
  maxQuality: 100,
} as const;

/* ----------------------------------
   Image validation
----------------------------------- */

export interface ImageValidationResult {
  valid: boolean;
  error: string | null;
}

export function validateEnhancerImage(
  file: File
): ImageValidationResult {
  if (!file || file.size <= 0) {
    return {
      valid: false,
      error: "Please select a valid image.",
    };
  }

  if (
    !IMAGE_ENHANCER_LIMITS.allowedMimeTypes.includes(
      file.type as (typeof IMAGE_ENHANCER_LIMITS.allowedMimeTypes)[number]
    )
  ) {
    return {
      valid: false,
      error: "Only JPG, PNG and WebP images are supported.",
    };
  }

  if (file.size > IMAGE_ENHANCER_LIMITS.maxFileSize) {
    return {
      valid: false,
      error: "Image size must not exceed 10 MB.",
    };
  }

  return {
    valid: true,
    error: null,
  };
}

/* ----------------------------------
   File size formatting
----------------------------------- */

export function formatFileSize(
  bytes: number,
  decimals = 2
): string {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return "0 Bytes";
  }

  if (bytes === 0) {
    return "0 Bytes";
  }

  const units = ["Bytes", "KB", "MB", "GB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );

  const size = bytes / Math.pow(1024, index);

  return `${size.toFixed(Math.max(0, decimals))} ${units[index]}`;
}

/* ----------------------------------
   Filename utilities
----------------------------------- */

export function getFileExtension(
  fileName: string
): string {
  const extension = fileName.split(".").pop();

  return extension && extension !== fileName
    ? extension.toLowerCase()
    : "";
}

export function getOutputFileName(
  originalName: string,
  format: EnhancementFormat
): string {
  const lastDot = originalName.lastIndexOf(".");
  const baseName =
    lastDot > 0
      ? originalName.slice(0, lastDot)
      : originalName;

  const extension =
    format === "original"
      ? getFileExtension(originalName) || "jpg"
      : format === "jpeg"
        ? "jpg"
        : format;

  const safeName = baseName
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);

  return `${safeName || "enhanced-image"}-enhanced.${extension}`;
}

/* ----------------------------------
   Enhancement settings validation
----------------------------------- */

export interface SettingsValidationResult {
  valid: boolean;
  error: string | null;
}

export function validateEnhancementSettings(
  scale: number,
  quality: number,
  format: string
): SettingsValidationResult {
  if (![2, 4].includes(scale)) {
    return {
      valid: false,
      error: "Invalid enhancement scale.",
    };
  }

  if (
    !Number.isInteger(quality) ||
    quality < IMAGE_ENHANCER_LIMITS.minQuality ||
    quality > IMAGE_ENHANCER_LIMITS.maxQuality
  ) {
    return {
      valid: false,
      error: "Quality must be between 50 and 100.",
    };
  }

  if (
    !["original", "jpeg", "png", "webp"].includes(format)
  ) {
    return {
      valid: false,
      error: "Unsupported output format.",
    };
  }

  return {
    valid: true,
    error: null,
  };
}

/* ----------------------------------
   Job status utilities
----------------------------------- */

const VALID_STATUSES: ImageEnhancerStatusType[] = [
  "idle",
  "uploading",
  "queued",
  "processing",
  "completed",
  "failed",
];

export function isValidEnhancerStatus(
  status: unknown
): status is ImageEnhancerStatusType {
  return (
    typeof status === "string" &&
    VALID_STATUSES.includes(status as ImageEnhancerStatusType)
  );
}

export function isEnhancementFinished(
  status: ImageEnhancerStatusType
): boolean {
  return status === "completed" || status === "failed";
}

/* ----------------------------------
   Error message utility
----------------------------------- */

export function getEnhancerErrorMessage(
  error: unknown
): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

/* ----------------------------------
   Safe image URL validation
----------------------------------- */

export function isValidImageUrl(
  value: unknown
): value is string {
  if (typeof value !== "string" || !value.trim()) {
    return false;
  }

  try {
    const url = new URL(value);

    return (
      url.protocol === "https:" ||
      url.protocol === "http:"
    );
  } catch {
    return false;
  }
}
