
import sharp from "sharp";
import path from "node:path";
import { fileTypeFromBuffer } from "file-type";

// --------------------------------------------------
// Configuration
// --------------------------------------------------

export const IMAGE_METADATA_LIMITS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024,
  MAX_WIDTH: 12_000,
  MAX_HEIGHT: 12_000,
  MAX_PIXELS: 40_000_000,
} as const;

const SUPPORTED_FORMATS = {
  jpeg: {
    mimeType: "image/jpeg",
    extensions: ["jpg", "jpeg"],
  },
  png: {
    mimeType: "image/png",
    extensions: ["png"],
  },
  webp: {
    mimeType: "image/webp",
    extensions: ["webp"],
  },
  tiff: {
    mimeType: "image/tiff",
    extensions: ["tif", "tiff"],
  },
} as const;

export type SupportedImageFormat =
  keyof typeof SUPPORTED_FORMATS;

export interface ImageMetadata {
  originalName: string;
  mimeType: string;
  format: SupportedImageFormat;
  extension: string;

  size: number;

  width: number;
  height: number;

  orientedWidth: number;
  orientedHeight: number;

  aspectRatio: number;
  megapixels: number;

  hasAlpha: boolean;
  isAnimated: boolean;

  orientation: number | null;

  pages: number;

  colorSpace: string | null;
  channels: number | null;

  density: number | null;
}

export interface ImageMetadataInput {
  buffer: Buffer;
  originalName: string;
  declaredMimeType?: string;
}

export class ImageMetadataError extends Error {
  public readonly code: string;

  constructor(
    message: string,
    code: string,
  ) {
    super(message);
    this.name = "ImageMetadataError";
    this.code = code;
  }
}

// --------------------------------------------------
// Helpers
// --------------------------------------------------

function getSafeFileName(name: string): string {
  if (typeof name !== "string" || !name.trim()) {
    return "image";
  }

  const normalized = path
    .basename(name.replace(/\\/g, "/"))
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim();

  return normalized.slice(0, 255) || "image";
}

function getExtension(name: string): string {
  return path.extname(name).replace(".", "").toLowerCase();
}

function getOrientedDimensions(
  width: number,
  height: number,
  orientation: number | undefined,
): {
  width: number;
  height: number;
} {
  if (
    orientation !== undefined &&
    orientation >= 5 &&
    orientation <= 8
  ) {
    return {
      width: height,
      height: width,
    };
  }

  return {
    width,
    height,
  };
}

function normalizeMimeType(mimeType: string): string {
  return mimeType.split(";")[0].trim().toLowerCase();
}

function validateDeclaredMimeType(
  declaredMimeType: string | undefined,
  actualMimeType: string,
): void {
  if (!declaredMimeType) {
    return;
  }

  const normalized = normalizeMimeType(declaredMimeType);

  if (normalized !== actualMimeType) {
    throw new ImageMetadataError(
      "Declared MIME type does not match the actual image format.",
      "MIME_TYPE_MISMATCH",
    );
  }
}

function validateDimensions(
  width: number,
  height: number,
): void {
  if (
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width <= 0 ||
    height <= 0
  ) {
    throw new ImageMetadataError(
      "Image dimensions are invalid.",
      "INVALID_DIMENSIONS",
    );
  }

  if (
    width > IMAGE_METADATA_LIMITS.MAX_WIDTH ||
    height > IMAGE_METADATA_LIMITS.MAX_HEIGHT
  ) {
    throw new ImageMetadataError(
      "Image dimensions exceed the maximum allowed size.",
      "DIMENSIONS_TOO_LARGE",
    );
  }

  if (
    width * height >
    IMAGE_METADATA_LIMITS.MAX_PIXELS
  ) {
    throw new ImageMetadataError(
      "Image contains too many pixels.",
      "PIXEL_LIMIT_EXCEEDED",
    );
  }
}

// --------------------------------------------------
// Main metadata extractor
// --------------------------------------------------

export async function extractImageMetadata(
  input: ImageMetadataInput,
): Promise<ImageMetadata> {
  const {
    buffer,
    declaredMimeType,
  } = input;

  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new ImageMetadataError(
      "A valid image buffer is required.",
      "INVALID_BUFFER",
    );
  }

  if (
    buffer.length >
    IMAGE_METADATA_LIMITS.MAX_FILE_SIZE
  ) {
    throw new ImageMetadataError(
      "Image exceeds the maximum allowed file size.",
      "FILE_TOO_LARGE",
    );
  }

  const originalName = getSafeFileName(
    input.originalName,
  );

  // Detect actual file format using file signatures.
  let detectedFileType;

  try {
    detectedFileType = await fileTypeFromBuffer(buffer);
  } catch {
    throw new ImageMetadataError(
      "Could not detect the uploaded file format.",
      "FORMAT_DETECTION_FAILED",
    );
  }

  if (!detectedFileType) {
    throw new ImageMetadataError(
      "Uploaded file is not a recognized image.",
      "UNKNOWN_FORMAT",
    );
  }

  const format = detectedFileType.ext as SupportedImageFormat;

  if (!(format in SUPPORTED_FORMATS)) {
    throw new ImageMetadataError(
      "This image format is not supported.",
      "UNSUPPORTED_FORMAT",
    );
  }

  const formatConfig = SUPPORTED_FORMATS[format];

  // Verify declared MIME type against detected content.
  validateDeclaredMimeType(
    declaredMimeType,
    formatConfig.mimeType,
  );

  // Inspect image using Sharp.
  let metadata: sharp.Metadata;

  try {
    metadata = await sharp(buffer, {
      failOn: "error",
      limitInputPixels: IMAGE_METADATA_LIMITS.MAX_PIXELS,
      animated: true,
      sequentialRead: true,
    }).metadata();
  } catch {
    throw new ImageMetadataError(
      "Image is corrupt or cannot be decoded.",
      "INVALID_IMAGE",
    );
  }

  if (metadata.format !== format) {
    throw new ImageMetadataError(
      "Image signature and decoded image format do not match.",
      "FORMAT_MISMATCH",
    );
  }

  if (!metadata.width || !metadata.height) {
    throw new ImageMetadataError(
      "Image dimensions could not be determined.",
      "INVALID_DIMENSIONS",
    );
  }

  validateDimensions(
    metadata.width,
    metadata.height,
  );

  const extension = getExtension(originalName);

  if (
    extension &&
    !formatConfig.extensions.includes(
      extension as never,
    )
  ) {
    throw new ImageMetadataError(
      "File extension does not match the actual image format.",
      "EXTENSION_MISMATCH",
    );
  }

  const orientation = metadata.orientation ?? null;

  const oriented = getOrientedDimensions(
    metadata.width,
    metadata.height,
    metadata.orientation,
  );

  const pages = metadata.pages ?? 1;

  return {
    originalName,

    mimeType: formatConfig.mimeType,
    format,

    extension: formatConfig.extensions[0],

    size: buffer.length,

    width: metadata.width,
    height: metadata.height,

    orientedWidth: oriented.width,
    orientedHeight: oriented.height,

    aspectRatio: Number(
      (oriented.width / oriented.height).toFixed(4),
    ),

    megapixels: Number(
      (
        (metadata.width * metadata.height) /
        1_000_000
      ).toFixed(2),
    ),

    hasAlpha: metadata.hasAlpha ?? false,

    isAnimated:
      format === "webp" &&
      (pages > 1 || (metadata.pages ?? 1) > 1),

    orientation,

    pages,

    colorSpace: metadata.space ?? null,

    channels: metadata.channels ?? null,

    density: metadata.density ?? null,
  };
}

// --------------------------------------------------
// Convenience helper
// --------------------------------------------------

export async function isSupportedImage(
  buffer: Buffer,
): Promise<boolean> {
  try {
    await extractImageMetadata({
      buffer,
      originalName: "image",
    });

    return true;
  } catch {
    return false;
  }
}
