
"use client";

import { useImageEnhancer } from "@/hooks/useImageEnhancer";
import ImageUpload from "./ImageUpload";
import EnhancementEditor from "@/components/tools/image-enhancer/EnhancementEditor";
import BeforeAfterPreview from "@/components/tools/image-enhancer/BeforeAfterPreview";
import ImageEnhancerStatus from "@/components/tools/image-enhancer/ImageEnhancerStatus";
import EnhancementResult from "@/components/tools/image-enhancer/EnhancementResult";

export default function ImageEnhancerTool() {
  const {
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
  } = useImageEnhancer();

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 text-[#121212]">
      {/* Upload */}
      <section className="rounded-3xl border border-[#fb8500]/20 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4">
          <h2 className="text-lg font-black text-[#121212]">
            Upload your image
          </h2>

          <p className="mt-1 text-sm text-[#555555]">
            Select an image from your device to get started.
          </p>
        </div>

        <ImageUpload
          file={file}
          previewUrl={previewUrl}
          onFileSelect={setFile}
          disabled={isLoading}
        />
      </section>

      {/* Enhancement settings */}
      {file && (
        <section className="rounded-3xl border border-[#fb8500]/20 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5">
            <h2 className="text-lg font-black text-[#121212]">
              Enhancement settings
            </h2>

            <p className="mt-1 text-sm text-[#555555]">
              Configure how you want your image to be enhanced.
            </p>
          </div>

          <EnhancementEditor
            settings={settings}
            onSettingsChange={updateSettings}
            disabled={isLoading}
          />

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={enhanceImage}
              disabled={isLoading || !file}
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-[#fb8500] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#fb8500]/20 transition-colors hover:bg-[#e07600] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fb8500] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? "Enhancing image..." : "Enhance image"}
            </button>

            <button
              type="button"
              onClick={reset}
              disabled={isLoading}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#fb8500]/30 bg-[#fff3ec] px-5 py-3 text-sm font-bold text-[#555555] transition-colors hover:border-[#fb8500]/60 hover:bg-[#fb8500]/10 hover:text-[#121212] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fb8500] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              Reset
            </button>
          </div>
        </section>
      )}

      {/* Processing status, loading state, and success message */}
      {result ? (
        <div className="flex items-center gap-4 rounded-3xl border border-green-500/30 bg-green-50/90 p-5 shadow-sm">
          <div className="flex shrink-0 items-center justify-center rounded-2xl bg-green-500 p-3 text-white shadow-sm">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path
                d="M20 6L9 17l-5-5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <div>
            <h3 className="text-base font-black text-green-900">
              Enhancement completed
            </h3>

            <p className="mt-0.5 text-xs font-medium text-green-700">
              Your enhanced image is ready to view and download below.
            </p>
          </div>
        </div>
      ) : isLoading ? (
        <div className="flex items-center gap-4 rounded-3xl border border-[#fb8500]/30 bg-[#fff3ec]/80 p-5 shadow-sm">
          <div className="flex shrink-0 items-center justify-center rounded-2xl bg-[#fb8500] p-3 text-white shadow-sm">
            <svg
              className="h-5 w-5 animate-spin text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />

              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>

          <div>
            <h3 className="text-base font-black text-[#121212]">
              Enhancing your image...
            </h3>

            <p className="mt-0.5 text-xs font-medium text-[#555555]">
              Please wait while we prepare your image.
            </p>
          </div>
        </div>
      ) : (
        <ImageEnhancerStatus
          status={status}
          error={error}
        />
      )}

      {/* Before and after preview */}
      {file && result && (
        <section className="rounded-3xl border border-[#fb8500]/20 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5">
            <h2 className="text-lg font-black text-[#121212]">
              Before & after
            </h2>

            <p className="mt-1 text-sm text-[#555555]">
              Compare your original image with the enhanced result.
            </p>
          </div>

          <BeforeAfterPreview
            originalUrl={previewUrl}
            enhancedUrl={result.url}
          />
        </section>
      )}

      {/* Download result */}
      {result && (
        <section className="rounded-3xl border border-[#fb8500]/20 bg-white p-5 shadow-sm sm:p-6">
          <EnhancementResult result={result} />
        </section>
      )}
    </div>
  );
}
