
"use client";

import {
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";

import axios from "axios";

import {
  imageService,
  type ResizeOptions,
} from "../services/imageService";

type ResizeStatus =
  | "idle"
  | "uploading"
  | "processing"
  | "completed"
  | "failed";

interface JobResult {
  status: string;
  jobId?: string;
  failedReason?: string;
  [key: string]: unknown;
}

const POLLING_INTERVAL = 2000;

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
          const data: JobResult =
            await imageService.checkJobStatus(jobId);

          // Ignore results from an outdated request
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

            setError(
              data.failedReason ||
                "Image processing failed"
            );

            setStatus("failed");
            setLoading(false);
            setProgressMessage(
              "Image processing failed."
            );

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

          // Schedule the next check only after
          // the current request finishes.
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
            "Error checking job status"
          );

          setError(message);
          setStatus("failed");
          setLoading(false);
          setProgressMessage(
            "Unable to check image processing status."
          );

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
        setError("Please select an image first.");
        setStatus("failed");
        return;
      }

      busyRef.current = true;

      // Invalidate any previous polling request
      requestIdRef.current += 1;

      const requestId = requestIdRef.current;

      stopPolling();

      setLoading(true);
      setStatus("uploading");
      setError(null);
      setResult(null);

      setProgressMessage(
        "Uploading image and queuing job..."
      );

      try {
        const response =
          await imageService.resizeImage(
            file,
            options
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

        const message = getErrorMessage(
          err,
          "Failed to upload image"
        );

        setError(message);
        setStatus("failed");
        setLoading(false);

        setProgressMessage(
          "Image upload or processing request failed."
        );

        busyRef.current = false;
      }
    },
    [pollJobStatus, stopPolling]
  );

  // Reset the hook to its initial state
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
