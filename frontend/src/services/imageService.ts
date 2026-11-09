import axios from "axios";

// Backend API URL
const BACKEND_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "development"
    ? "http://localhost:5000/api/v1"
    : "")
).replace(/\/+$/, "");

// Image resize options matching original configuration
export interface ResizeOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: "jpeg" | "png" | "webp" | "avif";
  maintainAspectRatio?: boolean;
  targetKb?: number;           // 👈 Supports frontend state
  targetFileSizeKB?: number;   // 👈 Supports original backend option
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

// Axios instance
const imageAPI = axios.create({
  baseURL: BACKEND_URL,
  withCredentials: true,
  timeout: 60000,
});

// Validate and append numeric values
function appendNumberOption(
  formData: FormData,
  key: string,
  value?: number
): void {
  if (
    value !== undefined &&
    value !== null &&
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
        "Backend API URL is missing. Please configure NEXT_PUBLIC_API_URL."
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

    // Aspect ratio setting
    formData.append(
      "maintainAspectRatio",
      String(options.maintainAspectRatio ?? true)
    );

    // Target output file size (Handles both targetKb and targetFileSizeKB seamlessly)
    const targetKbValue = options.targetKb ?? options.targetFileSizeKB;
    appendNumberOption(formData, "targetFileSizeKB", targetKbValue);

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

    const response =
      await imageAPI.post<ResizeJobResponse>(
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
        "Backend API URL is missing. Please configure NEXT_PUBLIC_API_URL."
      );
    }

    const response =
      await imageAPI.get<ResizeJobStatusResponse>(
        `/images/status/${encodeURIComponent(jobId)}`
      );

    const data = response.data as any;

    return (
      data?.job ??
      data?.data?.job ??
      data?.data ??
      data
    );
  },
};