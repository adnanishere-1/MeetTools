
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly success: boolean;
  public readonly errors: unknown[];

  constructor(
    statusCode: number,
    message: string = "Something went wrong",
    errors: unknown[] = [],
    stack?: string
  ) {
    super(message);

    // Identify this error clearly in logs.
    this.name = "ApiError";

    // Validate HTTP error status code.
    if (
      !Number.isInteger(statusCode) ||
      statusCode < 400 ||
      statusCode > 599
    ) {
      throw new RangeError(
        "ApiError statusCode must be between 400 and 599."
      );
    }

    this.statusCode = statusCode;
    this.success = false;
    this.errors = errors;

    // Restore correct prototype for Error subclassing.
    Object.setPrototypeOf(
      this,
      new.target.prototype
    );

    // Use custom stack if supplied.
    if (stack) {
      this.stack = stack;
    } else if (Error.captureStackTrace) {
      Error.captureStackTrace(
        this,
        this.constructor
      );
    }
  }

  // Convert to a safe JSON response.
  public toJSON() {
    return {
      success: this.success,
      statusCode: this.statusCode,
      message: this.message,
      errors: this.errors,
    };
  }
}
