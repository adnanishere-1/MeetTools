
import type {
  Request,
  Response,
  NextFunction,
  RequestHandler,
} from "express";

import { z } from "zod";
import { ApiError } from "../utils/ApiError.js";
import { STATUS_CODES } from "../utils/statusCodes.js";

type ValidationSource = "body" | "query" | "params";

type ValidationOptions = {
  source?: ValidationSource;
  wrapped?: boolean;
};

type JoiSchema = {
  validate: (
    value: unknown,
    options: {
      abortEarly: boolean;
      convert: boolean;
      allowUnknown: boolean;
    }
  ) => {
    error?: {
      details: Array<{ message: string }>;
    };
    value: unknown;
  };
};

type SupportedSchema = z.ZodType | JoiSchema;

function saveValidatedData(
  req: Request,
  res: Response,
  source: ValidationSource,
  value: unknown
): void {
  if (source === "body") {
    req.body = value;
    return;
  }

  if (source === "query") {
    // Express 5: req.query can be read-only.
    res.locals.validatedQuery = value;
    return;
  }

  res.locals.validatedParams = value;
}

function validationError(
  next: NextFunction,
  messages: string[]
): void {
  next(
    new ApiError(
      STATUS_CODES.BAD_REQUEST,
      `Validation Error: ${messages.join("; ")}`
    )
  );
}

export function validate(
  schema: SupportedSchema,
  options: ValidationOptions = {}
): RequestHandler {
  const source = options.source ?? "body";
  const wrapped = options.wrapped ?? true;

  return (
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    try {
      // Never continue with an absent JSON body.
      if (
        source === "body" &&
        (req.body === undefined || req.body === null)
      ) {
        next(
          new ApiError(
            STATUS_CODES.BAD_REQUEST,
            "Request body is missing. Send a JSON object with Content-Type: application/json."
          )
        );
        return;
      }

      // ZOD FIRST: avoids accidental Joi detection.
      if (
        schema !== null &&
        typeof schema === "object" &&
        "safeParse" in schema &&
        typeof schema.safeParse === "function"
      ) {
        const zodSchema = schema as z.ZodType;

        const input = wrapped
          ? {
              body: req.body,
              query: req.query,
              params: req.params,
            }
          : req[source];

        const result = zodSchema.safeParse(input);

        if (!result.success) {
          validationError(
            next,
            result.error.issues.map((issue) => {
              const path = issue.path.join(".");
              return path
                ? `${path}: ${issue.message}`
                : issue.message;
            })
          );
          return;
        }

        if (wrapped) {
          const data = result.data;

          if (
            data === null ||
            typeof data !== "object" ||
            Array.isArray(data)
          ) {
            next(
              new ApiError(
                STATUS_CODES.INTERNAL_SERVER_ERROR,
                "Invalid wrapped validation schema"
              )
            );
            return;
          }

          const validated = data as {
            body?: unknown;
            query?: unknown;
            params?: unknown;
          };

          if (
            Object.prototype.hasOwnProperty.call(
              validated,
              "body"
            )
          ) {
            saveValidatedData(
              req,
              res,
              "body",
              validated.body
            );
          }

          if (
            Object.prototype.hasOwnProperty.call(
              validated,
              "query"
            )
          ) {
            saveValidatedData(
              req,
              res,
              "query",
              validated.query
            );
          }

          if (
            Object.prototype.hasOwnProperty.call(
              validated,
              "params"
            )
          ) {
            saveValidatedData(
              req,
              res,
              "params",
              validated.params
            );
          }
        } else {
          saveValidatedData(
            req,
            res,
            source,
            result.data
          );
        }

        next();
        return;
      }

      // Legacy Joi support
      if (
        schema !== null &&
        typeof schema === "object" &&
        "validate" in schema &&
        typeof schema.validate === "function"
      ) {
        const joiSchema = schema as JoiSchema;

        const { error, value } = joiSchema.validate(
          req[source],
          {
            abortEarly: false,
            convert: true,
            allowUnknown: false,
          }
        );

        if (error) {
          validationError(
            next,
            error.details.map(
              (detail) => detail.message
            )
          );
          return;
        }

        saveValidatedData(req, res, source, value);
        next();
        return;
      }

      next(
        new ApiError(
          STATUS_CODES.INTERNAL_SERVER_ERROR,
          "Unsupported validation schema"
        )
      );
    } catch (error) {
      next(error);
    }
  };
}
