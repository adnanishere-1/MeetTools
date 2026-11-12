
"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  imageEnhancerService,
} from "@/services/imageEnhancer.service";

import type {
  EnhancementSettings,
} from "@/components/tools/image-enhancer/EnhancementEditor";

import type {
  EnhancementResultData,
} from "@/components/tools/image-enhancer/EnhancementResult";

import type {
  ImageEnhancerStatusType,
} from "@/components/tools/image-enhancer/ImageEnhancerStatus";

const POLLING_INTERVAL = 2000;
const MAX_POLLING_ATTEMPTS = 120;

interface JobState {
  jobId: string;
  attempts: number;
}

interface EnhancementResultWithJobId extends EnhancementResultData {
  jobId: string;
}

function getErrorMessage(
  error: unknown,
  fallback: string
): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

function isAbortError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.name === "AbortError"
  );
}

function normalizeStatus(
  status: unknown
): ImageEnhancerStatusType {
  switch (status) {
    case "queued":
    case "processing":
    case "completed":
    case "failed":
      return status;

    default:
      return "processing";
  }
}

export function useImageEnhancer() {
  const [file, setFileState] = useState<File | null>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(
    null
  );

  const [settings, setSettings] = useState<EnhancementSettings>({
    scale: 2,
    format: "original",
    quality: 90,
  });

  const [result, setResult] =
    useState<EnhancementResultWithJobId | null>(null);

  const [status, setStatus] =
    useState<ImageEnhancerStatusType>("idle");

  const [error, setError] = useState<string | null>(null);

  const [job, setJob] = useState<JobState | null>(null);

  const uploadControllerRef =
    useRef<AbortController | null>(null);

  const isLoading =
    status === "uploading" ||
    status === "queued" ||
    status === "processing";

  /**
   * Clean up the previous local image preview URL.
   */
  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  /**
   * Abort active upload when the hook unmounts.
   */
  useEffect(() => {
    return () => {
      uploadControllerRef.current?.abort();
      uploadControllerRef.current = null;
    };
  }, []);

  /**
   * Select or replace the source image.
   */
  const setFile = useCallback(
    (selectedFile: File | null) => {
      uploadControllerRef.current?.abort();
      uploadControllerRef.current = null;

      const newPreviewUrl = selectedFile
        ? URL.createObjectURL(selectedFile)
        : null;

      setFileState(selectedFile);
      setPreviewUrl(newPreviewUrl);
      setResult(null);
      setError(null);
      setJob(null);
      setStatus("idle");
    },
    []
  );

  /**
   * Update enhancement settings.
   */
  const updateSettings = useCallback(
    (updatedSettings: Partial<EnhancementSettings>) => {
      setSettings((currentSettings) => ({
        ...currentSettings,
        ...updatedSettings,
      }));
    },
    []
  );

  /**
   * Upload image and create an enhancement job.
   *
   * POST /api/v1/enhancer
   */
  const enhanceImage = useCallback(async () => {
    if (!file || isLoading) {
      return;
    }

    uploadControllerRef.current?.abort();

    const controller = new AbortController();

    uploadControllerRef.current = controller;

    setResult(null);
    setError(null);
    setJob(null);
    setStatus("uploading");

    try {
      const response =
        await imageEnhancerService.enhanceImage(
          {
            image: file,
          },
          controller.signal
        );

      if (controller.signal.aborted) {
        return;
      }

      const jobId = response?.data?.jobId;

      if (
        typeof jobId !== "string" ||
        !jobId.trim()
      ) {
        throw new Error(
          "The server did not return a valid job ID."
        );
      }

      setStatus(
        normalizeStatus(response.data.status)
      );

      setJob({
        jobId,
        attempts: 0,
      });
    } catch (err) {
      if (
        controller.signal.aborted ||
        isAbortError(err)
      ) {
        return;
      }

      setError(
        getErrorMessage(
          err,
          "Unable to start image enhancement. Please try again."
        )
      );

      setStatus("failed");
    } finally {
      if (uploadControllerRef.current === controller) {
        uploadControllerRef.current = null;
      }
    }
  }, [file, isLoading]);

  /**
   * Poll enhancement job status.
   *
   * GET /api/v1/enhancer/:jobId
   */
  useEffect(() => {
    if (!job?.jobId) {
      return;
    }

    let cancelled = false;

    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const controller = new AbortController();

    const scheduleNextPoll = (attempts: number) => {
      timeoutId = setTimeout(() => {
        if (!cancelled) {
          setJob({
            jobId: job.jobId,
            attempts,
          });
        }
      }, POLLING_INTERVAL);
    };

    const poll = async () => {
      try {
        const response =
          await imageEnhancerService.getJobStatus(
            job.jobId,
            controller.signal
          );

        if (cancelled || controller.signal.aborted) {
          return;
        }

        const jobData = response?.data;

        if (!jobData) {
          throw new Error(
            "The server returned an invalid job status."
          );
        }

        const currentStatus = normalizeStatus(
          jobData.status
        );

        /**
         * Completed job:
         * Retrieve the result separately.
         */
        if (currentStatus === "completed") {
          const resultResponse =
            await imageEnhancerService.getEnhancementResult(
              job.jobId,
              controller.signal
            );

          if (cancelled || controller.signal.aborted) {
            return;
          }

          const resultData = resultResponse?.data;

          if (
            !resultData ||
            typeof resultData.downloadUrl !== "string" ||
            !resultData.downloadUrl.trim()
          ) {
            throw new Error(
              "Enhanced image download URL was not returned."
            );
          }

          const output = resultData.output;

          const fileName = output?.format
            ? `enhanced-image.${output.format}`
            : "enhanced-image";

          setResult({
            jobId: job.jobId,
            url: resultData.downloadUrl,
            fileName,
            ...(output?.format
              ? { format: output.format }
              : {}),
            ...(typeof output?.width === "number"
              ? { width: output.width }
              : {}),
            ...(typeof output?.height === "number"
              ? { height: output.height }
              : {}),
            ...(typeof output?.size === "number"
              ? { size: output.size }
              : {}),
          });

          setError(null);
          setStatus("completed");
          setJob(null);

          return;
        }

        /**
         * Failed job.
         */
        if (currentStatus === "failed") {
          setError(
            jobData.error?.message ||
              "Image enhancement failed. Please try again."
          );

          setStatus("failed");
          setJob(null);

          return;
        }

        /**
         * Continue polling while queued or processing.
         */
        const nextAttempt = job.attempts + 1;

        if (nextAttempt >= MAX_POLLING_ATTEMPTS) {
          setError(
            "Image processing is taking longer than expected. Please try again later."
          );

          setStatus("failed");
          setJob(null);

          return;
        }

        setStatus(currentStatus);
        scheduleNextPoll(nextAttempt);
      } catch (err) {
        if (
          cancelled ||
          controller.signal.aborted ||
          isAbortError(err)
        ) {
          return;
        }

        setError(
          getErrorMessage(
            err,
            "Unable to retrieve image enhancement status."
          )
        );

        setStatus("failed");
        setJob(null);
      }
    };

    timeoutId = setTimeout(() => {
      void poll();
    }, POLLING_INTERVAL);

    return () => {
      cancelled = true;
      controller.abort();

      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
    };
  }, [job]);

  /**
   * Reset the complete enhancer state.
   */
  const reset = useCallback(() => {
    uploadControllerRef.current?.abort();
    uploadControllerRef.current = null;

    setFileState(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    setJob(null);
    setStatus("idle");
  }, []);

  return {
    file,
    previewUrl,
    result,
    settings,
    status,
    error,
    isLoading,
    setFile,
    updateSettings,
    enhanceImage,
    reset,
  };
}
