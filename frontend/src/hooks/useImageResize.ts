"use client";

import {
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";

import axios from "axios";
import { toast } from "sonner"; // 👈 Sonner toast imported

import {
  imageService,
  type ResizeOptions as BaseResizeOptions,
} from "../services/imageService";

// 👇 Added targetKb property support to ResizeOptions interface
export interface ResizeOptions extends BaseResizeOptions {
  targetKb?: number;
}

type ResizeStatus =
  | "idle"
  | "uploading"
  | "processing"
  | "completed"
  | "failed";

interface JobResult {
  status?: string; // 👈 Made optional to fix TypeScript type mismatch with service response
  jobId?: string;
  failedReason?: string;
  [key: string]: unknown;
}

interface ImageDimensions {
  width: number;
  height: number;
}

const POLLING_INTERVAL = 2000;

// Get original image dimensions
function getImageDimensions(file: File): Promise<ImageDimensions> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      const dimensions = {
        width: image.naturalWidth,
        height: image.naturalHeight,
      };

      URL.revokeObjectURL(objectUrl);
      resolve(dimensions);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Unable to read image dimensions."));
    };

    image.src = objectUrl;
  });
}

// Calculate dimensions while maintaining aspect ratio
async function getResizeOptions(
  file: File,
  options: ResizeOptions
): Promise<ResizeOptions> {
  if (options.maintainAspectRatio === false) {
    return options;
  }

  const hasWidth =
    options.width !== undefined &&
    Number.isFinite(options.width) &&
    options.width > 0;

  const hasHeight =
    options.height !== undefined &&
    Number.isFinite(options.height) &&
    options.height > 0;

  // No dimensions provided
  if (!hasWidth && !hasHeight) {
    return {
      ...options,
      maintainAspectRatio: true,
    };
  }

  const original = await getImageDimensions(file);

  const aspectRatio = original.width / original.height;

  let width = options.width;
  let height = options.height;

  // Width is provided: calculate height automatically
  if (hasWidth && !hasHeight) {
    height = Math.round(width! / aspectRatio);
  }

  // Height is provided: calculate width automatically
  else if (!hasWidth && hasHeight) {
    width = Math.round(height! * aspectRatio);
  }

  // Both are provided: keep width and calculate matching height
  else if (hasWidth && hasHeight) {
    height = Math.round(width! / aspectRatio);
  }

  return {
    ...options,
    width,
    height,
    maintainAspectRatio: true,
  };
}

function getErrorMessage(
  error: unknown,
  fallback: string
): string {
  if (axios.isAxiosError(error)) {
    return (
      error.response?.data?.error?.message ||
      error.response?.data?.message ||
      error.message ||
      fallback
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

export function useImageResize() {
  const [loading, setLoading] = useState(false);

  const [status, setStatus] =
    useState<ResizeStatus>("idle");

  const [progressMessage, setProgressMessage] =
    useState("");

  const [result, setResult] =
    useState<JobResult | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const timerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const mountedRef = useRef(true);
  const requestIdRef = useRef(0);
  const busyRef = useRef(false);

  // Stop scheduled polling
  const stopPolling = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Clean up when component unmounts
  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      requestIdRef.current += 1;
      stopPolling();
    };
  }, [stopPolling]);

  // Poll job status until completed or failed
  const pollJobStatus = useCallback(
    (jobId: string, requestId: number) => {
      const checkStatus = async () => {
        if (
          !mountedRef.current ||
          requestId !== requestIdRef.current
        ) {
          return;
        }

        try {
          const rawData = await imageService.checkJobStatus(jobId);
          const data = rawData as JobResult; // 👈 Safely mapped to JobResult to resolve data type issue

          // Ignore outdated requests
          if (
            !mountedRef.current ||
            requestId !== requestIdRef.current
          ) {
            return;
          }

          if (data.status === "completed") {
            stopPolling();

            setResult(data);
            setStatus("completed");
            setLoading(false);
            setError(null);

            setProgressMessage(
              "Image processed successfully!"
            );

            busyRef.current = false;
            return;
          }

          if (data.status === "failed") {
            stopPolling();

            const failMsg =
              data.failedReason ||
              "Image processing failed.";

            setError(failMsg);
            setStatus("failed");
            setLoading(false);

            setProgressMessage(
              "Image processing failed."
            );

            // 🔥 Sonner Toast for Job Failure
            toast.error("Image processing failed", {
              description: failMsg,
            });

            busyRef.current = false;
            return;
          }

          setStatus("processing");

          setProgressMessage(
            data.status === "waiting" ||
              data.status === "queued"
              ? "Image queued. Waiting for background worker..."
              : "Background worker is processing your image..."
          );

          // Schedule next check after current request finishes
          timerRef.current = setTimeout(
            checkStatus,
            POLLING_INTERVAL
          );
        } catch (err: unknown) {
          if (
            !mountedRef.current ||
            requestId !== requestIdRef.current
          ) {
            return;
          }

          stopPolling();

          const message = getErrorMessage(
            err,
            "Error checking job status."
          );

          setError(message);
          setStatus("failed");
          setLoading(false);

          setProgressMessage(
            "Unable to check image processing status."
          );

          // 🔥 Sonner Toast for Polling Error
          toast.error("Status check failed", {
            description: message,
          });

          busyRef.current = false;
        }
      };

      // First status check after 2 seconds
      timerRef.current = setTimeout(
        checkStatus,
        POLLING_INTERVAL
      );
    },
    [stopPolling]
  );

  // Upload image and start backend processing
  const handleResize = useCallback(
    async (
      file: File,
      options: ResizeOptions
    ): Promise<void> => {
      // Prevent duplicate submissions
      if (busyRef.current) {
        return;
      }

      if (!file) {
        const errMsg = "Please select an image first.";
        setError(errMsg);
        setStatus("failed");
        toast.warning(errMsg);
        return;
      }

      busyRef.current = true;

      // Invalidate previous polling request
      requestIdRef.current += 1;

      const requestId = requestIdRef.current;

      stopPolling();

      setLoading(true);
      setStatus("uploading");
      setError(null);
      setResult(null);

      setProgressMessage(
        "Reading image dimensions..."
      );

      try {
        // Calculate missing dimension automatically
        const finalOptions = await getResizeOptions(
          file,
          options
        );

        if (
          !mountedRef.current ||
          requestId !== requestIdRef.current
        ) {
          return;
        }

        setProgressMessage(
          "Uploading image and queuing job..."
        );

        const response =
          await imageService.resizeImage(
            file,
            finalOptions
          );

        if (
          !mountedRef.current ||
          requestId !== requestIdRef.current
        ) {
          return;
        }

        const jobId = response.jobId;

        if (!jobId) {
          throw new Error(
            "Backend did not return a job ID."
          );
        }

        setStatus("processing");

        setProgressMessage(
          "Image queued. Processing in background..."
        );

        // Start polling the real backend job
        pollJobStatus(String(jobId), requestId);
      } catch (err: unknown) {
        if (
          !mountedRef.current ||
          requestId !== requestIdRef.current
        ) {
          return;
        }

        // 🔥 RATE LIMIT (429) & GENERAL ERROR HANDLING FOR SONNER TOAST
        if (axios.isAxiosError(err)) {
          const status = err.response?.status;
          const serverMessage =
            err.response?.data?.error?.message ||
            err.response?.data?.message ||
            err.response?.data?.error;

          if (status === 429) {
            toast.error("Too Many Requests", {
              description:
                serverMessage ||
                "You have reached your request limit. Please try again later.",
            });
            setError("Rate limit reached");
            setStatus("failed");
            setLoading(false);
            busyRef.current = false;
            return;
          }
        }

        const message = getErrorMessage(
          err,
          "Failed to upload or process image."
        );

        setError(message);
        setStatus("failed");
        setLoading(false);

        setProgressMessage(
          "Image upload or processing request failed."
        );

        // 🔥 Sonner Toast for Request Failure
        toast.error("Operation failed", {
          description: message,
        });

        busyRef.current = false;
      }
    },
    [pollJobStatus, stopPolling]
  );

  // Reset hook to initial state
  const resetResize = useCallback(() => {
    requestIdRef.current += 1;

    stopPolling();
    busyRef.current = false;

    setLoading(false);
    setStatus("idle");
    setProgressMessage("");
    setResult(null);
    setError(null);
  }, [stopPolling]);

  return {
    handleResize,
    loading,
    status,
    progressMessage,
    result,
    error,
    resetResize,
  };
}