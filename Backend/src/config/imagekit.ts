
import "dotenv";
config();

import ImageKit from "imagekit";

import { logger } from "../utils/logger.js";
import { config } from "dotenv";

// =====================================
// ImageKit Environment Configuration
// =====================================

function getRequiredEnv(
  key: string
): string {
  const value = process.env[key]?.trim();

  if (!value) {
    throw new Error(
      `Missing required ImageKit environment variable: ${key}`
    );
  }

  return value;
}

const publicKey = getRequiredEnv(
  "IMAGEKIT_PUBLIC_KEY"
);

const privateKey = getRequiredEnv(
  "IMAGEKIT_PRIVATE_KEY"
);

const rawUrlEndpoint = getRequiredEnv(
  "IMAGEKIT_URL_ENDPOINT"
);

// Validate URL endpoint.
let urlEndpoint: string;

try {
  const parsedUrl = new URL(rawUrlEndpoint);

  if (parsedUrl.protocol !== "https:") {
    throw new Error(
      "ImageKit URL endpoint must use HTTPS."
    );
  }

  urlEndpoint = rawUrlEndpoint.replace(/\/+$/, "");
} catch {
  throw new Error(
    "Invalid IMAGEKIT_URL_ENDPOINT. Provide a valid HTTPS URL."
  );
}

// =====================================
// Initialize ImageKit
// =====================================

export const imagekit = new ImageKit({
  publicKey,
  privateKey,
  urlEndpoint,
});

logger.info(
  "✅ ImageKit configuration initialized successfully."
);

// =====================================
// Helper Functions
// =====================================

function getErrorMessage(
  error: unknown
): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function validateFileName(
  fileName: string
): string {
  if (
    typeof fileName !== "string" ||
    !fileName.trim()
  ) {
    throw new Error(
      "A valid file name is required."
    );
  }

  const normalizedFileName = fileName.trim();

  if (
    normalizedFileName === "." ||
    normalizedFileName === ".." ||
    normalizedFileName.includes("/") ||
    normalizedFileName.includes("\\") ||
    /[\x00-\x1F\x7F]/.test(normalizedFileName)
  ) {
    throw new Error(
      "File name contains invalid characters."
    );
  }

  if (normalizedFileName.length > 255) {
    throw new Error(
      "File name is too long."
    );
  }

  return normalizedFileName;
}

function validateFolder(
  folder: string
): string {
  if (
    typeof folder !== "string" ||
    !folder.trim()
  ) {
    throw new Error(
      "A valid ImageKit folder is required."
    );
  }

  const normalizedFolder =
    "/" + folder.trim().replace(/^\/+|\/+$/g, "");

  const segments = normalizedFolder
    .split("/")
    .filter(Boolean);

  if (
    segments.some(
      (segment) =>
        segment === "." ||
        segment === ".." ||
        /[\x00-\x1F\x7F\\]/.test(segment)
    )
  ) {
    throw new Error(
      "Invalid ImageKit folder path."
    );
  }

  return normalizedFolder;
}

// =====================================
// Upload File to ImageKit
// =====================================

export async function uploadToImageKit(
  fileBuffer: Buffer,
  fileName: string,
  folder: string = "/meettools/uploads"
) {
  // Validate input buffer.
  if (
    !Buffer.isBuffer(fileBuffer) ||
    fileBuffer.length === 0
  ) {
    throw new Error(
      "Cannot upload an empty or invalid file buffer."
    );
  }

  const safeFileName =
    validateFileName(fileName);

  const safeFolder =
    validateFolder(folder);

  try {
    logger.info(
      `📤 Uploading file to ImageKit: ${safeFileName}`
    );

    const response = await imagekit.upload({
      file: fileBuffer,
      fileName: safeFileName,
      folder: safeFolder,

      // Generate unique names to prevent overwriting.
      useUniqueFileName: true,
    });

    logger.info(
      `✅ File uploaded successfully to ImageKit: ${response.fileId}`
    );

    return response;
  } catch (error: unknown) {
    logger.error(
      {
        err: error,
        fileName: safeFileName,
      },
      "❌ ImageKit upload failed"
    );

    throw new Error(
      `Failed to upload image to ImageKit: ${getErrorMessage(error)}`
    );
  }
}

// =====================================
// Delete File from ImageKit
// =====================================

export async function deleteFromImageKit(
  fileId: string
): Promise<void> {
  if (
    typeof fileId !== "string" ||
    !fileId.trim()
  ) {
    throw new Error(
      "A valid ImageKit file ID is required."
    );
  }

  const normalizedFileId = fileId.trim();

  try {
    await imagekit.deleteFile(
      normalizedFileId
    );

    logger.info(
      `🗑️ Successfully deleted ImageKit file: ${normalizedFileId}`
    );
  } catch (error: unknown) {
    logger.error(
      {
        err: error,
        fileId: normalizedFileId,
      },
      "❌ ImageKit file deletion failed"
    );

    throw new Error(
      `Failed to delete image from ImageKit: ${getErrorMessage(error)}`
    );
  }
}
