import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError.js';
import { STATUS_CODES } from '../utils/statusCodes.js';

export const validate = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body, { abortEarly: false });

    if (error) {
      const errorMessages = error.details.map((detail: any) => detail.message);
      throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Validation Error', errorMessages);
    }

    next();
  };
};