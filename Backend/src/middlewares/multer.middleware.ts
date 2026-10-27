import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { fileTypeFromBuffer } from 'file-type';
import { ApiError } from '../utils/ApiError.js';
import { STATUS_CODES } from '../utils/statusCodes.js';

const storage = multer.memoryStorage();

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new ApiError(STATUS_CODES.BAD_REQUEST, 'Only image files are allowed!') as any, false);
  }
};

export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // Limit: 10 MB per image
  },
  fileFilter,
});

/**
 * 🛡️ Security Middleware: Verify Real Image Content (Magic Numbers / Binary Header Check)
 * Prevents malicious script uploads disguised as images (e.g., shell.php renamed to image.jpg)
 */
export const verifyRealImage = async (req: Request, res: Response, next: NextFunction) => {
  const files = req.files as Express.Multer.File[] | undefined;
  const singleFile = req.file;

  const targetFiles: Express.Multer.File[] = [];
  if (singleFile) targetFiles.push(singleFile);
  if (files && Array.isArray(files)) targetFiles.push(...files);

  if (targetFiles.length === 0) {
    return next();
  }

  for (const file of targetFiles) {
    try {
      const detectedType = await fileTypeFromBuffer(file.buffer);
      const allowedExtensions = ['jpg', 'png', 'webp', 'avif', 'gif'];

      if (!detectedType || !allowedExtensions.includes(detectedType.ext)) {
        return next(
          new ApiError(
            STATUS_CODES.BAD_REQUEST,
            `Security Alert: Malicious or fake file detected (${file.originalname}). File content does not match a valid image format.`
          )
        );
      }
    } catch (error) {
      return next(new ApiError(STATUS_CODES.INTERNAL_SERVER_ERROR, 'Error validating file security.'));
    }
  }

  next();
};