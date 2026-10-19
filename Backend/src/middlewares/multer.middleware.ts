import multer from 'multer';
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