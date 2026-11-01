
import type {
  Request,
  Response,
  NextFunction,
} from "express";

import multer from "multer";
import { fileTypeFromBuffer } from "file-type";

import { ApiError } from "../utils/ApiError.js";
import { STATUS_CODES } from "../utils/statusCodes.js";

// =====================================
// Configuration
// =====================================

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
]);

// =====================================
// Storage
// =====================================

const storage = multer.memoryStorage();

// =====================================
// MIME Filter
// =====================================

const fileFilter: multer.Options["fileFilter"] = (
  _req,
  file,
  cb
) => {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(
      new ApiError(
        STATUS_CODES.UNSUPPORTED_MEDIA_TYPE,
        "Unsupported image format. Only JPEG, PNG, WebP, AVIF and GIF are allowed."
      )
    );
    return;
  }

  cb(null, true);
};

// =====================================
// Upload Configuration
// =====================================

export const upload = multer({
  storage,

  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
    fields: 20,
    fieldNameSize: 100,
    fieldSize: 64 * 1024,
    parts: 21,
    headerPairs: 100,
  },

  fileFilter,
});

// =====================================
// Collect Uploaded Files
// =====================================

function getUploadedFiles(
  req: Request
): Express.Multer.File[] {
  const files: Express.Multer.File[] = [];

  if (req.file) {
    files.push(req.file);
  }

  if (Array.isArray(req.files)) {
    files.push(...req.files);
  } else if (
    req.files &&
    typeof req.files === "object"
  ) {
    for (const fileGroup of Object.values(req.files)) {
      files.push(...fileGroup);
    }
  }

  return files;
}

// =====================================
// Verify Actual Image Content
// =====================================

export const verifyRealImage = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const files = getUploadedFiles(req);

    if (files.length === 0) {
      next();
      return;
    }

    if (files.length > 1) {
      throw new ApiError(
        STATUS_CODES.BAD_REQUEST,
        "Only one image is allowed per request."
      );
    }

    for (const file of files) {
      if (
        !file.buffer ||
        file.buffer.length === 0
      ) {
        throw new ApiError(
          STATUS_CODES.BAD_REQUEST,
          "Uploaded image is empty or invalid."
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        throw new ApiError(
          STATUS_CODES.PAYLOAD_TOO_LARGE,
          "Image size must not exceed 10 MB."
        );
      }

      const detectedType = await fileTypeFromBuffer(
        file.buffer
      );

      if (
        !detectedType ||
        !ALLOWED_MIME_TYPES.has(detectedType.mime)
      ) {
        throw new ApiError(
          STATUS_CODES.UNSUPPORTED_MEDIA_TYPE,
          "Invalid image content or unsupported image format."
        );
      }

      if (file.mimetype !== detectedType.mime) {
        throw new ApiError(
          STATUS_CODES.BAD_REQUEST,
          "Image MIME type does not match its file content."
        );
      }
    }

    next();
  } catch (error) {
    if (error instanceof ApiError) {
      next(error);
      return;
    }

    next(
      new ApiError(
        STATUS_CODES.BAD_REQUEST,
        "Unable to verify uploaded image."
      )
    );
  }
};
