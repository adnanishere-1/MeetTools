
import type {
  Request,
  Response,
  NextFunction,
  RequestHandler,
} from "express";

/**
 * Wraps Express controllers and forwards
 * synchronous/asynchronous errors to
 * the global error-handling middleware.
 *
 * Compatible with Express 4 and Express 5.
 */
export const asyncHandler = (
  fn: (
    req: Request,
    res: Response,
    next: NextFunction
  ) => Promise<unknown> | unknown
): RequestHandler => {
  return (req, res, next): void => {
    Promise.resolve()
      .then(() => fn(req, res, next))
      .catch(next);
  };
};
