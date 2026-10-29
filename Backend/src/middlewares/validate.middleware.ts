
import type {
  Request,
  Response,
  NextFunction,
} from "express";

import { z } from "zod";

import { ApiError } from "../utils/ApiError.js";
import { STATUS_CODES } from "../utils/statusCodes.js";

// =====================================
// Types
// =====================================

type ValidationSource =
  | "body"
  | "query"
  | "params";

type ValidationOptions = {
  source?: ValidationSource;
};

type JoiValidationResult = {
  error?: {
    details: Array<{
      message: string;
    }>;
  };
  value: unknown;
};

type JoiValidationSchema = {
  validate: (
    input: unknown,
    options: {
      abortEarly: boolean;
      convert: boolean;
      allowUnknown: boolean;
    }
  ) => JoiValidationResult;
};

type SupportedSchema =
  | JoiValidationSchema
  | z.ZodType;

// =====================================
// Type Guards
// =====================================

function isJoiSchema(
  schema: SupportedSchema
): schema is JoiValidationSchema {
  return (
    "validate" in schema &&
    typeof schema.validate === "function"
  );
}

function isZodSchema(
  schema: SupportedSchema
): schema is z.ZodType {
  return (
    "safeParse" in schema &&
    typeof schema.safeParse === "function"
  );
}

// =====================================
// Helpers
// =====================================

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
    // Express 5 req.query may be
    // getter-only.
    res.locals.validatedQuery = value;
    return;
  }

  res.locals.validatedParams = value;
}

function getValidationInput(
  req: Request,
  source: ValidationSource
): unknown {
  return req[source];
}

// =====================================
// Validation Middleware
// =====================================

/**
 * Supports both Joi and Zod schemas.
 *
 * Joi:
 * validate(joiSchema)
 * validate(joiQuerySchema, {
 *   source: "query"
 * })
 *
 * Zod (direct):
 * validate(z.object({...}))
 *
 * Zod (request wrapper):
 * validate(z.object({
 *   body: z.object({...})
 * }))
 */
export const validate = (
  schema: SupportedSchema,
  options: ValidationOptions = {}
) => {
  return (
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    const source =
      options.source ?? "body";

    // =================================
    // Joi Validation
    // =================================

    if (isJoiSchema(schema)) {
      const input =
        getValidationInput(req, source);

      const { error, value } =
        schema.validate(input, {
          abortEarly: false,
          convert: true,
          allowUnknown: false,
        });

      if (error) {
        const messages =
          error.details.map(
            (detail) => detail.message
          );

        next(
          new ApiError(
            STATUS_CODES.BAD_REQUEST,
            `Validation Error: ${messages.join("; ")}`
          )
        );

        return;
      }

      saveValidatedData(
        req,
        res,
        source,
        value
      );

      next();
      return;
    }

    // =================================
    // Zod Validation
    // =================================

    if (isZodSchema(schema)) {
      // Zod schemas in this project may
      // use a request wrapper:
      // { body: ..., query: ..., params: ... }
      //
      // We validate the complete request
      // shape so updateProfileSchema works.

      const requestData = {
        body: req.body,
        query: req.query,
        params: req.params,
      };

      const result =
        schema.safeParse(requestData);

      if (!result.success) {
        const messages =
          result.error.issues.map(
            (issue) => {
              const path =
                issue.path.join(".");

              return path
                ? `${path}: ${issue.message}`
                : issue.message;
            }
          );

        next(
          new ApiError(
            STATUS_CODES.BAD_REQUEST,
            `Validation Error: ${messages.join("; ")}`
          )
        );

        return;
      }

      const parsed =
        result.data;

      if (
        parsed !== null &&
        typeof parsed === "object" &&
        !Array.isArray(parsed) &&
        (
          "body" in parsed ||
          "query" in parsed ||
          "params" in parsed
        )
      ) {
        const validated =
          parsed as {
            body?: unknown;
            query?: unknown;
            params?: unknown;
          };

        if (
          validated.body !== undefined
        ) {
          saveValidatedData(
            req,
            res,
            "body",
            validated.body
          );
        }

        if (
          validated.query !== undefined
        ) {
          saveValidatedData(
            req,
            res,
            "query",
            validated.query
          );
        }

        if (
          validated.params !== undefined
        ) {
          saveValidatedData(
            req,
            res,
            "params",
            validated.params
          );
        }
      } else {
        // Direct Zod schema:
        // validate(z.object({...}))
        saveValidatedData(
          req,
          res,
          source,
          parsed
        );
      }

      next();
      return;
    }

    next(
      new ApiError(
        STATUS_CODES.INTERNAL_SERVER_ERROR,
        "Unsupported validation schema"
      )
    );
  };
};
