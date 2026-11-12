
const API_PREFIX = /\/api\/v1$/i.test(
  process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/+$/, "") || ""
)
  ? ""
  : "/api/v1";

function getApiBaseUrl(): string {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL
    ?.trim()
    .replace(/\/+$/, "");

  if (!apiBaseUrl) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured.");
  }

  return apiBaseUrl;
}

/**
 * Supports:
 * http://localhost:5000
 * http://localhost:5000/api/v1
 */
const API_ROUTES = {
  enhance: `${API_PREFIX}/enhancer`,
  status: (jobId: string) =>
    `${API_PREFIX}/enhancer/${encodeURIComponent(jobId)}`,
  result: (jobId: string) =>
    `${API_PREFIX}/enhancer/${encodeURIComponent(jobId)}/result`,
};

export type EnhancementMode = "auto" | "manual";

export type EnhancementFormat =
  | "original"
  | "jpeg"
  | "png"
  | "webp";

export interface EnhanceImagePayload {
  image: File;

  mode?: EnhancementMode;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  sharpness?: number;
  noiseReduction?: number;

  autoExposure?: boolean;
  autoContrast?: boolean;
  autoColorCorrection?: boolean;

  outputFormat?: EnhancementFormat;
  outputQuality?: number;
}

export type ImageEnhancerJobStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed";

export interface ImageEnhancerOutput {
  storageKey?: string;
  format: string;
  size: number;
  width: number;
  height: number;
}

export interface ImageEnhancerError {
  code?: string;
  message: string;
}

export interface EnhanceImageResponse {
  success: boolean;
  message?: string;
  data: {
    jobId: string;
    status: ImageEnhancerJobStatus;
  };
}

export interface ImageEnhancerJobResponse {
  success: boolean;
  message?: string;
  data: {
    jobId: string;
    status: ImageEnhancerJobStatus;
    input?: {
      originalName: string;
      mimeType: string;
      format: string;
      size: number;
      width: number;
      height: number;
    };
    output?: ImageEnhancerOutput;
    error?: ImageEnhancerError;
    createdAt?: string;
    completedAt?: string;
  };
}

export interface ImageEnhancerResultResponse {
  success: boolean;
  message?: string;
  data: {
    jobId: string;
    output: ImageEnhancerOutput;
    downloadUrl: string;
    expiresAt: string;
  };
}

export class ImageEnhancerApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(
    message: string,
    status: number,
    code?: string,
    details?: unknown
  ) {
    super(message);

    this.name = "ImageEnhancerApiError";
    this.status = status;
    this.code = code;
    this.details = details;

    Object.setPrototypeOf(
      this,
      ImageEnhancerApiError.prototype
    );
  }
}

type ApiRequestOptions = RequestInit & {
  signal?: AbortSignal;
};

async function apiRequest<T>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const url = `${getApiBaseUrl()}${endpoint}`;

  let response: Response;

  try {
    response = await fetch(url, {
      ...options,
      credentials: "include",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...options.headers,
      },
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === "AbortError"
    ) {
      throw error;
    }

    throw new ImageEnhancerApiError(
      "Unable to connect to the server. Please check your internet connection.",
      0,
      "NETWORK_ERROR",
      error
    );
  }

  const contentType =
    response.headers.get("content-type") || "";

  let responseData: unknown = null;

  try {
    if (contentType.includes("application/json")) {
      responseData = await response.json();
    } else {
      const responseText = await response.text();

      if (responseText) {
        try {
          responseData = JSON.parse(responseText);
        } catch {
          responseData = {
            message: responseText,
          };
        }
      }
    }
  } catch {
    if (!response.ok) {
      throw new ImageEnhancerApiError(
        "The server returned an invalid response.",
        response.status,
        "INVALID_RESPONSE"
      );
    }

    throw new ImageEnhancerApiError(
      "Unable to read the server response.",
      response.status,
      "RESPONSE_PARSE_ERROR"
    );
  }

  if (!response.ok) {
    const data =
      typeof responseData === "object" &&
      responseData !== null
        ? (responseData as Record<string, unknown>)
        : {};

    const nestedError =
      typeof data.error === "object" &&
      data.error !== null
        ? (data.error as Record<string, unknown>)
        : {};

    const message =
      (typeof data.message === "string" &&
        data.message) ||
      (typeof nestedError.message === "string" &&
        nestedError.message) ||
      "Image enhancement request failed.";

    const code =
      (typeof data.code === "string" &&
        data.code) ||
      (typeof nestedError.code === "string" &&
        nestedError.code) ||
      undefined;

    throw new ImageEnhancerApiError(
      message,
      response.status,
      code,
      responseData
    );
  }

  if (
    typeof responseData !== "object" ||
    responseData === null ||
    !("success" in responseData) ||
    responseData.success !== true
  ) {
    throw new ImageEnhancerApiError(
      "The server returned an unsuccessful response.",
      response.status,
      "INVALID_API_RESPONSE",
      responseData
    );
  }

  return responseData as T;
}

function validateNumber(
  value: number | undefined,
  field: string,
  min: number,
  max: number,
  integer = false
): void {
  if (value === undefined) return;

  if (
    !Number.isFinite(value) ||
    value < min ||
    value > max ||
    (integer && !Number.isInteger(value))
  ) {
    throw new Error(
      `${field} must be ${
        integer ? "an integer" : "a number"
      } between ${min} and ${max}.`
    );
  }
}

function validateEnhancementPayload(
  payload: EnhanceImagePayload
): void {
  if (
    typeof File === "undefined" ||
    !(payload.image instanceof File)
  ) {
    throw new Error("Please select a valid image file.");
  }

  if (payload.image.size <= 0) {
    throw new Error("The selected image is empty.");
  }

  if (
    payload.mode !== undefined &&
    !["auto", "manual"].includes(payload.mode)
  ) {
    throw new Error("Unsupported enhancement mode.");
  }

  if (
    payload.outputFormat !== undefined &&
    !["original", "jpeg", "png", "webp"].includes(
      payload.outputFormat
    )
  ) {
    throw new Error("Unsupported image output format.");
  }

  validateNumber(
    payload.brightness,
    "Brightness",
    -100,
    100
  );

  validateNumber(
    payload.contrast,
    "Contrast",
    -100,
    100
  );

  validateNumber(
    payload.saturation,
    "Saturation",
    -100,
    100
  );

  validateNumber(
    payload.sharpness,
    "Sharpness",
    0,
    100
  );

  validateNumber(
    payload.noiseReduction,
    "Noise reduction",
    0,
    100
  );

  validateNumber(
    payload.outputQuality,
    "Output quality",
    60,
    95,
    true
  );

  const booleanOptions = [
    payload.autoExposure,
    payload.autoContrast,
    payload.autoColorCorrection,
  ];

  if (
    booleanOptions.some(
      (value) =>
        value !== undefined &&
        typeof value !== "boolean"
    )
  ) {
    throw new Error(
      "Invalid automatic enhancement option."
    );
  }

  const mode = payload.mode ?? "auto";

  if (
    mode === "auto" &&
    [
      payload.brightness ?? 0,
      payload.contrast ?? 0,
      payload.saturation ?? 0,
    ].some((value) => value !== 0)
  ) {
    throw new Error(
      "Brightness, contrast and saturation adjustments require manual mode."
    );
  }
}

function validateJobId(jobId: string): void {
  if (
    typeof jobId !== "string" ||
    !jobId.trim() ||
    jobId.length > 255
  ) {
    throw new Error(
      "A valid enhancement job ID is required."
    );
  }
}

function appendEnhancementOptions(
  formData: FormData,
  payload: EnhanceImagePayload
): void {
  formData.append("mode", payload.mode ?? "auto");

  if (payload.brightness !== undefined) {
    formData.append(
      "brightness",
      String(payload.brightness)
    );
  }

  if (payload.contrast !== undefined) {
    formData.append(
      "contrast",
      String(payload.contrast)
    );
  }

  if (payload.saturation !== undefined) {
    formData.append(
      "saturation",
      String(payload.saturation)
    );
  }

  if (payload.sharpness !== undefined) {
    formData.append(
      "sharpness",
      String(payload.sharpness)
    );
  }

  if (payload.noiseReduction !== undefined) {
    formData.append(
      "noiseReduction",
      String(payload.noiseReduction)
    );
  }

  if (payload.autoExposure !== undefined) {
    formData.append(
      "autoExposure",
      String(payload.autoExposure)
    );
  }

  if (payload.autoContrast !== undefined) {
    formData.append(
      "autoContrast",
      String(payload.autoContrast)
    );
  }

  if (payload.autoColorCorrection !== undefined) {
    formData.append(
      "autoColorCorrection",
      String(payload.autoColorCorrection)
    );
  }

  const format = payload.outputFormat ?? "webp";

  formData.append(
    "outputFormat",
    format === "original" ? "webp" : format
  );

  if (payload.outputQuality !== undefined) {
    formData.append(
      "outputQuality",
      String(payload.outputQuality)
    );
  }
}

export const imageEnhancerService = {
  /**
   * Create an image enhancement job.
   *
   * POST /api/v1/enhancer
   */
  async enhanceImage(
    payload: EnhanceImagePayload,
    signal?: AbortSignal
  ): Promise<EnhanceImageResponse> {
    validateEnhancementPayload(payload);

    const formData = new FormData();

    formData.append("image", payload.image);

    appendEnhancementOptions(formData, payload);

    const response =
      await apiRequest<EnhanceImageResponse>(
        API_ROUTES.enhance,
        {
          method: "POST",
          body: formData,
          signal,
        }
      );

    if (
      !response.data ||
      typeof response.data.jobId !== "string" ||
      !response.data.jobId.trim()
    ) {
      throw new ImageEnhancerApiError(
        "The server did not return a valid enhancement job ID.",
        200,
        "INVALID_JOB_RESPONSE",
        response
      );
    }

    return response;
  },

  /**
   * Retrieve enhancement job status.
   *
   * GET /api/v1/enhancer/:jobId
   */
  async getJobStatus(
    jobId: string,
    signal?: AbortSignal
  ): Promise<ImageEnhancerJobResponse> {
    validateJobId(jobId);

    const response =
      await apiRequest<ImageEnhancerJobResponse>(
        API_ROUTES.status(jobId),
        {
          method: "GET",
          signal,
        }
      );

    if (
      !response.data ||
      typeof response.data.jobId !== "string" ||
      ![
        "queued",
        "processing",
        "completed",
        "failed",
      ].includes(response.data.status)
    ) {
      throw new ImageEnhancerApiError(
        "The server returned invalid job status data.",
        200,
        "INVALID_JOB_STATUS_RESPONSE",
        response
      );
    }

    return response;
  },

  /**
   * Retrieve completed enhancement result.
   *
   * GET /api/v1/enhancer/:jobId/result
   */
  async getEnhancementResult(
    jobId: string,
    signal?: AbortSignal
  ): Promise<ImageEnhancerResultResponse> {
    validateJobId(jobId);

    const response =
      await apiRequest<ImageEnhancerResultResponse>(
        API_ROUTES.result(jobId),
        {
          method: "GET",
          signal,
        }
      );

    if (
      !response.data ||
      typeof response.data.jobId !== "string" ||
      typeof response.data.downloadUrl !== "string" ||
      !response.data.downloadUrl.trim() ||
      !response.data.output
    ) {
      throw new ImageEnhancerApiError(
        "The server did not return a valid enhanced image result.",
        200,
        "INVALID_RESULT_RESPONSE",
        response
      );
    }

    return response;
  },
};
