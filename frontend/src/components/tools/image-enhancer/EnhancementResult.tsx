
"use client";

import { useState } from "react";

export interface EnhancementResultData {
  url: string;
  jobId?: string;
  fileName?: string;
  format?: string;
  width?: number;
  height?: number;
  size?: number;
}

interface EnhancementResultProps {
  result: EnhancementResultData;
  onReset?: () => void;
}

function formatFileSize(size?: number): string {
  if (
    typeof size !== "number" ||
    !Number.isFinite(size) ||
    size < 0
  ) {
    return "Not available";
  }

  if (size === 0) return "0 Bytes";

  const units = ["Bytes", "KB", "MB", "GB", "TB"];
  const index = Math.min(
    Math.floor(Math.log(size) / Math.log(1024)),
    units.length - 1
  );

  const value = size / Math.pow(1024, index);

  return `${value.toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}

function getSafeImageUrl(value: string): string | null {
  if (!value || typeof value !== "string") return null;

  try {
    const url = new URL(value);

    if (url.protocol !== "https:") return null;

    return url.href;
  } catch {
    return null;
  }
}

function sanitizeFileName(value?: string): string {
  if (!value?.trim()) return "enhanced-image";

  const sanitized = value
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/^\.+|\.+$/g, "")
    .trim()
    .slice(0, 120);

  return sanitized || "enhanced-image";
}

function getDownloadEndpoint(jobId: string): string {
  const configuredBase =
    process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/+$/, "") || "";

  const baseHasApiPrefix = /\/api\/v1$/i.test(configuredBase);
  const prefix = baseHasApiPrefix ? "" : "/api/v1";

  return `${configuredBase}${prefix}/enhancer/${encodeURIComponent(jobId)}/download`;
}

export default function EnhancementResult({
  result,
  onReset,
}: EnhancementResultProps) {
  return (
    <EnhancementResultContent
      key={result?.url ?? ""}
      result={result}
      onReset={onReset}
    />
  );
}

function EnhancementResultContent({
  result,
  onReset,
}: EnhancementResultProps) {
  const [imageError, setImageError] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  const imageUrl =
    typeof result?.url === "string"
      ? getSafeImageUrl(result.url)
      : null;

  const format = result?.format?.toUpperCase() || "Image";

  const hasDimensions =
    typeof result?.width === "number" &&
    Number.isFinite(result.width) &&
    result.width > 0 &&
    typeof result?.height === "number" &&
    Number.isFinite(result.height) &&
    result.height > 0;

  const dimensions = hasDimensions
    ? `${result.width} × ${result.height} px`
    : "Not available";

  const fileSize = formatFileSize(result?.size);

  const extension =
    result?.format?.toLowerCase().replace(/[^a-z0-9]/g, "") ||
    "webp";

  const fileName = sanitizeFileName(result?.fileName);

  const downloadName = fileName.includes(".")
    ? fileName
    : `${fileName}.${extension}`;

  async function handleDownload() {
    if (!result?.jobId || isDownloading) return;

    setIsDownloading(true);
    setDownloadError("");

    let objectUrl: string | null = null;

    try {
      const endpoint = getDownloadEndpoint(result.jobId);

      const response = await fetch(endpoint, {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "image/*, application/octet-stream",
        },
      });

      if (!response.ok) {
        let message = "Unable to download the enhanced image.";

        try {
          const data = await response.json();
          if (typeof data?.message === "string") {
            message = data.message;
          }
        } catch {
          // Keep the default message.
        }

        if (response.status === 404) {
          message = "Enhanced image is no longer available.";
        }

        throw new Error(message);
      }

      const blob = await response.blob();

      if (!blob.size) {
        throw new Error("Downloaded image is empty.");
      }

      objectUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = downloadName;
      link.style.display = "none";

      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      setDownloadError(
        error instanceof Error
          ? error.message
          : "Download failed. Please try again."
      );
    } finally {
      if (objectUrl) {
        window.setTimeout(() => {
          window.URL.revokeObjectURL(objectUrl!);
        }, 5000);
      }

      setIsDownloading(false);
    }
  }

  return (
    <section
      className="w-full rounded-2xl border border-[#fb8500]/20 bg-white p-5 shadow-sm sm:p-7"
      aria-labelledby="enhancement-result-title"
    >
      <div className="mb-6 flex flex-col items-center text-center">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-600">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-7 w-7"
            aria-hidden="true"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>

        <h2
          id="enhancement-result-title"
          className="text-xl font-bold text-[#121212] sm:text-2xl"
        >
          Image Enhanced Successfully!
        </h2>

        <p className="mt-2 max-w-md text-sm text-[#555555]">
          Your enhanced image is ready. Preview it below
          or download the processed image.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-[#e8ded2] bg-[#fff3ec]">
        {imageUrl !== null && !imageError ? (
          <div className="flex min-h-[220px] items-center justify-center p-3 sm:min-h-[320px] sm:p-5">
            <img
              key={imageUrl}
              src={imageUrl}
              alt="Enhanced image preview"
              className="max-h-[500px] w-auto max-w-full rounded-lg object-contain"
              loading="eager"
              decoding="async"
              onError={() => setImageError(true)}
            />
          </div>
        ) : (
          <div
            className="flex min-h-[240px] flex-col items-center justify-center gap-3 px-5 text-center"
            role="status"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              className="h-12 w-12 text-gray-400"
              aria-hidden="true"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="m21 15-5-5L5 21" />
            </svg>

            <p className="text-sm font-medium text-gray-700">
              Image preview is unavailable.
            </p>

            <p className="text-xs text-gray-500">
              Please try again or upload another image.
            </p>
          </div>
        )}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl bg-[#fff3ec] p-3">
          <p className="text-xs text-[#555555]">Format</p>
          <p className="mt-1 break-words text-sm font-semibold text-[#121212]">
            {format}
          </p>
        </div>

        <div className="rounded-xl bg-[#fff3ec] p-3">
          <p className="text-xs text-[#555555]">Dimensions</p>
          <p className="mt-1 break-words text-sm font-semibold text-[#121212]">
            {dimensions}
          </p>
        </div>

        <div className="rounded-xl bg-[#fff3ec] p-3">
          <p className="text-xs text-[#555555]">File Size</p>
          <p className="mt-1 break-words text-sm font-semibold text-[#121212]">
            {fileSize}
          </p>
        </div>

        <div className="rounded-xl bg-[#fff3ec] p-3">
          <p className="text-xs text-[#555555]">Status</p>
          <p className="mt-1 text-sm font-semibold text-green-700">
            Completed
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        {imageUrl !== null && result?.jobId ? (
          <button
            type="button"
            onClick={handleDownload}
            disabled={isDownloading}
            className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#fb8500] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#e07600] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fb8500] focus-visible:ring-offset-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <path d="m7 10 5 5 5-5" />
              <path d="M12 15V3" />
            </svg>

            {isDownloading
              ? "Downloading..."
              : "Download Enhanced Image"}
          </button>
        ) : (
          <button
            type="button"
            disabled
            className="inline-flex min-h-12 flex-1 cursor-not-allowed items-center justify-center rounded-xl bg-gray-300 px-5 py-3 text-sm font-semibold text-gray-600"
          >
            Download Unavailable
          </button>
        )}

        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#e8ded2] bg-white px-5 py-3 text-sm font-semibold text-[#121212] transition-colors hover:bg-[#fff3ec] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fb8500] focus-visible:ring-offset-2"
          >
            Enhance Another Image
          </button>
        )}
      </div>

      {downloadError && (
        <p
          className="mt-3 text-center text-sm text-red-600"
          role="alert"
        >
          {downloadError}
        </p>
      )}

      <p className="mt-4 text-center text-xs text-gray-500">
        Your download link may expire according to the server&apos;s retention policy.
      </p>
    </section>
  );
}
