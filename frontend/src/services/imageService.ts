
import axios from "axios";

// Direct Express backend URL
// Development: http://localhost:5000
// Production: configure NEXT_PUBLIC_API_URL
const BACKEND_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000/api/v1"
).replace(/\/$/, "");

// Image resize options
export interface ResizeOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: "jpeg" | "png" | "webp" | "avif";
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
  status: string;
  failedReason?: string;
  result?: unknown;
  [key: string]: unknown;
}

// Axios instance for image processing API
const imageAPI = axios.create({
  baseURL: BACKEND_URL,

  // Send HttpOnly authentication cookies
  withCredentials: true,

  timeout: 60000,
});

// Add an option only when it has a valid value
function appendNumberOption(
  formData: FormData,
  key: string,
  value?: number
): void {
  if (
    value !== undefined &&
    value !== null &&
    Number.isFinite(value)
  ) {
    formData.append(key, String(value));
  }
}

export const imageService = {
  // Upload image and create a processing job
  resizeImage: async (
    file: File,
    options: ResizeOptions
  ): Promise<ResizeJobResponse> => {
    if (!file) {
      throw new Error("Please select an image.");
    }

    const formData = new FormData();

    // Matches Multer upload.single("image")
    formData.append("image", file);

    appendNumberOption(
      formData,
      "width",
      options.width
    );

    appendNumberOption(
      formData,
      "height",
      options.height
    );

    appendNumberOption(
      formData,
      "quality",
      options.quality
    );

    if (options.format) {
      formData.append("format", options.format);
    }

    appendNumberOption(
      formData,
      "targetFileSizeKB",
      options.targetFileSizeKB
    );

    appendNumberOption(
      formData,
      "targetFileSizeMB",
      options.targetFileSizeMB
    );

    if (
      options.preserveResolution !== undefined
    ) {
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

  // Check background BullMQ job status
  checkJobStatus: async (
    jobId: string
  ): Promise<ResizeJobStatusResponse> => {
    if (!jobId) {
      throw new Error("Job ID is required.");
    }

    const response =
      await imageAPI.get<ResizeJobStatusResponse>(
        `/images/status/${encodeURIComponent(jobId)}`
      );

    return response.data;
  },
};
