
import sharp from "sharp";
import path from "node:path";
import { fileTypeFromBuffer } from "file-type";

// --------------------------------------------------
// Configuration
// --------------------------------------------------

export const IMAGE_SECURITY_LIMITS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024,
  MAX_WIDTH: 12_000,
  MAX_HEIGHT: 12_000,
  MAX_PIXELS: 40_000_000,
  MAX_FILENAME_LENGTH: 255,
} as const;

const ALLOWED_IMAGE_TYPES = {
  jpeg: {
    mime: "image/jpeg",
    extensions: ["jpg", "jpeg"],
  },
  png: {
    mime: "image/png",
    extensions: ["png"],
  },
  webp: {
    mime: "image/webp",
    extensions: ["webp"],
  },
  tiff: {
    mime: "image/tiff",
    extensions: ["tif", "tiff"],
  },
} as const;

export type SecureImageFormat =
  keyof typeof ALLOWED_IMAGE_TYPES;

// --------------------------------------------------
// Types
// --------------------------------------------------

export interface ImageSecurityInput {
  buffer: Buffer;
  originalName: string;
  mimeType?: string;
}

export interface ImageSecurityResult {
  safe: true;
  originalName: string;
  detectedFormat: SecureImageFormat;
  detectedMimeType: string;
  size: number;
  width: number;
  height: number;
  pages: number;
  isAnimated: boolean;
  hasAlpha: boolean;
  orientation: number | null;
}

export interface SanitizeImageOptions {
  outputFormat?: "jpeg" | "png" | "webp";
  quality?: number;
  stripMetadata?: boolean;
}

export interface SanitizedImageResult {
  buffer: Buffer;
  format: "jpeg" | "png" | "webp";
  mimeType: string;
  size: number;
  width: number;
  height: number;
}

export class ImageSecurityError extends Error {
  public readonly code: string;

  constructor(
    message: string,
    code: string,
  ) {
    super(message);
    this.name = "ImageSecurityError";
    this.code = code;
  }
}

// --------------------------------------------------
// Filename validation
// --------------------------------------------------

function validateFilename(
  originalName: string,
): string {
  if (
    typeof originalName !== "string" ||
    !originalName.trim()
  ) {
    throw new ImageSecurityError(
      "A valid filename is required.",
      "INVALID_FILENAME",
    );
  }

  if (
    originalName.length >
    IMAGE_SECURITY_LIMITS.MAX_FILENAME_LENGTH
  ) {
    throw new ImageSecurityError(
      "Filename is too long.",
      "FILENAME_TOO_LONG",
    );
  }

  if (/[\u0000-\u001f\u007f]/.test(originalName)) {
    throw new ImageSecurityError(
      "Filename contains invalid characters.",
      "INVALID_FILENAME",
    );
  }

  const normalized = path
    .basename(originalName.replace(/\\/g, "/"))
    .trim();

  if (
    !normalized ||
    normalized === "." ||
    normalized === ".."
  ) {
    throw new ImageSecurityError(
      "Invalid filename.",
      "INVALID_FILENAME",
    );
  }

  return normalized;
}

// --------------------------------------------------
// MIME validation
// --------------------------------------------------

function normalizeMimeType(
  mimeType: string,
): string {
  return mimeType
    .split(";")[0]
    .trim()
    .toLowerCase();
}

function validateMimeType(
  declaredMimeType: string | undefined,
  actualMimeType: string,
): void {
  if (!declaredMimeType) {
    return;
  }

  const normalized = normalizeMimeType(
    declaredMimeType,
  );

  if (normalized !== actualMimeType) {
    throw new ImageSecurityError(
      "Uploaded MIME type does not match file content.",
      "MIME_TYPE_MISMATCH",
    );
  }
}

// --------------------------------------------------
// Image security inspection
// --------------------------------------------------

export async function inspectImageSecurity(
  input: ImageSecurityInput,
): Promise<ImageSecurityResult> {
  const {
    buffer,
    mimeType,
  } = input;

  // Validate filename.
  const originalName = validateFilename(
    input.originalName,
  );

  // Validate buffer.
  if (
    !Buffer.isBuffer(buffer) ||
    buffer.length === 0
  ) {
    throw new ImageSecurityError(
      "Invalid or empty image buffer.",
      "INVALID_BUFFER",
    );
  }

  // Prevent oversized uploads.
  if (
    buffer.length >
    IMAGE_SECURITY_LIMITS.MAX_FILE_SIZE
  ) {
    throw new ImageSecurityError(
      "Image exceeds the maximum allowed upload size.",
      "FILE_TOO_LARGE",
    );
  }

  // Detect actual file type.
  let detected;

  try {
    detected = await fileTypeFromBuffer(buffer);
  } catch {
    throw new ImageSecurityError(
      "Unable to inspect image file signature.",
      "SIGNATURE_CHECK_FAILED",
    );
  }

  if (!detected) {
    throw new ImageSecurityError(
      "Unknown or unsupported file format.",
      "UNKNOWN_FILE_FORMAT",
    );
  }

  const format =
    detected.ext as SecureImageFormat;

  if (!(format in ALLOWED_IMAGE_TYPES)) {
    throw new ImageSecurityError(
      "Only JPEG, PNG, WebP and TIFF images are supported.",
      "UNSUPPORTED_FORMAT",
    );
  }

  const typeConfig = ALLOWED_IMAGE_TYPES[format];

  // Validate MIME type against actual file content.
  validateMimeType(
    mimeType,
    typeConfig.mime,
  );

  // Validate filename extension.
  const extension = path
    .extname(originalName)
    .replace(".", "")
    .toLowerCase();

  if (
    extension &&
    !typeConfig.extensions.includes(
      extension as never,
    )
  ) {
    throw new ImageSecurityError(
      "Filename extension does not match image content.",
      "EXTENSION_MISMATCH",
    );
  }

  // Decode image safely with Sharp.
  let metadata: sharp.Metadata;

  try {
    metadata = await sharp(buffer, {
      failOn: "error",
      limitInputPixels:
        IMAGE_SECURITY_LIMITS.MAX_PIXELS,
      sequentialRead: true,
      animated: true,
    }).metadata();
  } catch {
    throw new ImageSecurityError(
      "Image is corrupt or cannot be decoded.",
      "INVALID_IMAGE",
    );
  }

  if (metadata.format !== format) {
    throw new ImageSecurityError(
      "File signature and decoded image format differ.",
      "FORMAT_MISMATCH",
    );
  }

  if (!metadata.width || !metadata.height) {
    throw new ImageSecurityError(
      "Image dimensions are invalid.",
      "INVALID_DIMENSIONS",
    );
  }

  // Check image dimensions.
  if (
    metadata.width >
      IMAGE_SECURITY_LIMITS.MAX_WIDTH ||
    metadata.height >
      IMAGE_SECURITY_LIMITS.MAX_HEIGHT
  ) {
    throw new ImageSecurityError(
      "Image dimensions exceed allowed limits.",
      "DIMENSIONS_TOO_LARGE",
    );
  }

  const pixels =
    metadata.width * metadata.height;

  if (
    !Number.isSafeInteger(pixels) ||
    pixels > IMAGE_SECURITY_LIMITS.MAX_PIXELS
  ) {
    throw new ImageSecurityError(
      "Image exceeds maximum pixel count.",
      "PIXEL_LIMIT_EXCEEDED",
    );
  }

  const pages = metadata.pages ?? 1;

  // Animated images are detected but rejected by default.
  if (pages > 1) {
    throw new ImageSecurityError(
      "Animated images are not supported.",
      "ANIMATED_IMAGE_NOT_SUPPORTED",
    );
  }

  return {
    safe: true,
    originalName,
    detectedFormat: format,
    detectedMimeType: typeConfig.mime,
    size: buffer.length,
    width: metadata.width,
    height: metadata.height,
    pages,
    isAnimated: false,
    hasAlpha: metadata.hasAlpha ?? false,
    orientation: metadata.orientation ?? null,
  };
}

// --------------------------------------------------
// Image sanitization
// --------------------------------------------------

/**
 * Decode and re-encode an image.
 *
 * This removes unsupported embedded payloads and avoids
 * serving the original uploaded file directly.
 */
export async function sanitizeImage(
  buffer: Buffer,
  options: SanitizeImageOptions = {},
): Promise<SanitizedImageResult> {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new ImageSecurityError(
      "A valid image buffer is required.",
      "INVALID_BUFFER",
    );
  }

  if (
    buffer.length >
    IMAGE_SECURITY_LIMITS.MAX_FILE_SIZE
  ) {
    throw new ImageSecurityError(
      "Image exceeds the maximum allowed upload size.",
      "FILE_TOO_LARGE",
    );
  }

  const outputFormat = options.outputFormat ?? "webp";

  const quality = Math.min(
    95,
    Math.max(60, Math.round(options.quality ?? 85)),
  );

  let pipeline = sharp(buffer, {
    failOn: "error",
    limitInputPixels:
      IMAGE_SECURITY_LIMITS.MAX_PIXELS,
    animated: false,
  }).rotate();

  switch (outputFormat) {
    case "jpeg":
      pipeline = pipeline.jpeg({
        quality,
        mozjpeg: true,
      });
      break;

    case "png":
      pipeline = pipeline.png({
        compressionLevel: 8,
      });
      break;

    case "webp":
      pipeline = pipeline.webp({
        quality,
        effort: 4,
      });
      break;

    default:
      throw new ImageSecurityError(
        "Unsupported sanitization output format.",
        "UNSUPPORTED_OUTPUT_FORMAT",
      );
  }

  // Sharp does not preserve EXIF, XMP or IPTC by default
  // unless metadata preservation methods are explicitly used.
  const result = await pipeline.toBuffer({
    resolveWithObject: true,
  });

  if (
    result.data.length === 0 ||
    result.data.length > 50 * 1024 * 1024
  ) {
    throw new ImageSecurityError(
      "Sanitized image output is invalid or too large.",
      "INVALID_SANITIZED_OUTPUT",
    );
  }

  const mimeTypes = {
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
  } as const;

  return {
    buffer: result.data,
    format: outputFormat,
    mimeType: mimeTypes[outputFormat],
    size: result.data.length,
    width: result.info.width,
    height: result.info.height,
  };
}

// --------------------------------------------------
// Convenience security check
// --------------------------------------------------

export async function isImageSafe(
  input: ImageSecurityInput,
): Promise<boolean> {
  try {
    await inspectImageSecurity(input);
    return true;
  } catch {
    return false;
  }
}
