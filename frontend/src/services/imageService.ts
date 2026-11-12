
import axios from "axios";

// Backend API URL
const BACKEND_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "development"
    ? "http://localhost:5000/api/v1"
    : "")
).replace(/\/+$/, "");

// Image resize options
export interface ResizeOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: "jpeg" | "png" | "webp" | "avif";
  maintainAspectRatio?: boolean;
  targetKb?: number;
  targetFileSizeKB?: number;
  targetFileSizeMB?: number;
  preserveResolution?: boolean;
}

// Backend response types
export interface ResizeJobResponse {
  jobId: string;
  status?: string;
  message?: string;
  [key: string]: unknown;
}

export interface ResizeJobStatusResponse {
  jobId?: string;
  status?: string;
  failedReason?: string;
  result?: unknown;
  job?: unknown;
  [key: string]: unknown;
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

// Axios instance
const imageAPI = axios.create({
  baseURL: BACKEND_URL,
  withCredentials: true,
  timeout: 60000,
});

// Append valid numeric values
function appendNumberOption(
  formData: FormData,
  key: string,
  value?: number
): void {
  if (
    value !== undefined &&
    Number.isFinite(value) &&
    value > 0
  ) {
    formData.append(key, String(value));
  }
}

export const imageService = {
  // Upload image and create resize job
  resizeImage: async (
    file: File,
    options: ResizeOptions
  ): Promise<ResizeJobResponse> => {
    if (!file) {
      throw new Error("Please select an image.");
    }

    if (!BACKEND_URL) {
      throw new Error(
        "Backend API URL is missing. Configure NEXT_PUBLIC_API_URL."
      );
    }

    const formData = new FormData();

    formData.append("image", file);

    appendNumberOption(formData, "width", options.width);
    appendNumberOption(formData, "height", options.height);
    appendNumberOption(formData, "quality", options.quality);

    if (options.format) {
      formData.append("format", options.format);
    }

    formData.append(
      "maintainAspectRatio",
      String(options.maintainAspectRatio ?? true)
    );

    const targetKbValue =
      options.targetKb ?? options.targetFileSizeKB;

    appendNumberOption(
      formData,
      "targetFileSizeKB",
      targetKbValue
    );

    appendNumberOption(
      formData,
      "targetFileSizeMB",
      options.targetFileSizeMB
    );

    if (options.preserveResolution !== undefined) {
      formData.append(
        "preserveResolution",
        String(options.preserveResolution)
      );
    }

    const response = await imageAPI.post<ResizeJobResponse>(
      "/images/resize",
      formData
    );

    return response.data;
  },

  // Check background job status
  checkJobStatus: async (
    jobId: string
  ): Promise<ResizeJobStatusResponse> => {
    if (!jobId) {
      throw new Error("Job ID is required.");
    }

    if (!BACKEND_URL) {
      throw new Error(
        "Backend API URL is missing. Configure NEXT_PUBLIC_API_URL."
      );
    }

    const response =
      await imageAPI.get<unknown>(
        `/images/status/${encodeURIComponent(jobId)}`
      );

    const responseData = response.data;

    if (!isRecord(responseData)) {
      throw new Error("Invalid job status response from server.");
    }

    const data = responseData.data;

    if (isRecord(data)) {
      if (isRecord(data.job)) {
        return data.job as ResizeJobStatusResponse;
      }

      return data as ResizeJobStatusResponse;
    }

    if (isRecord(responseData.job)) {
      return responseData.job as ResizeJobStatusResponse;
    }

    return responseData as ResizeJobStatusResponse;
  },
};
