
"use client";

import { useCallback, useRef, useState } from "react";

interface ImageUploadProps {
  file: File | null;
  previewUrl: string | null;
  onFileSelect: (file: File | null) => void;
  disabled?: boolean;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export default function ImageUpload({
  file,
  previewUrl,
  onFileSelect,
  disabled = false,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const validateAndSelect = useCallback(
    (selectedFile: File | undefined) => {
      if (!selectedFile || disabled) return;

      setError(null);

      if (!ACCEPTED_TYPES.includes(selectedFile.type)) {
        setError("Please select a JPG, PNG, or WebP image.");
        return;
      }

      if (selectedFile.size > MAX_FILE_SIZE) {
        setError("Image size must be 10 MB or less.");
        return;
      }

      if (selectedFile.size === 0) {
        setError("The selected image is empty.");
        return;
      }

      onFileSelect(selectedFile);

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    },
    [disabled, onFileSelect]
  );

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    validateAndSelect(event.target.files?.[0]);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);

    if (disabled) return;

    validateAndSelect(event.dataTransfer.files?.[0]);
  };

  const handleDragOver = (
    event: React.DragEvent<HTMLDivElement>
  ) => {
    event.preventDefault();

    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (
    event: React.DragEvent<HTMLDivElement>
  ) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };

  const removeImage = () => {
    if (disabled) return;

    onFileSelect(null);
    setError(null);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div className="w-full space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleInputChange}
        disabled={disabled}
        className="hidden"
        aria-label="Choose an image"
      />

      {file && previewUrl ? (
        <div className="rounded-3xl border border-[#fb8500]/20 bg-[#fff3ec]/40 p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="h-28 w-full overflow-hidden rounded-2xl border border-[#fb8500]/20 bg-white sm:w-36 flex items-center justify-center shadow-inner">
              <img
                src={previewUrl}
                alt={`Preview of ${file.name}`}
                className="h-full w-full object-contain"
              />
            </div>

            <div className="min-w-0 flex-1 space-y-1">
              <p className="truncate text-sm font-black text-[#121212]">
                {file.name}
              </p>

              <p className="text-xs font-bold text-[#777777]">
                {(file.size / (1024 * 1024)).toFixed(2)} MB
              </p>

              <div className="pt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  disabled={disabled}
                  className="rounded-xl border border-[#fb8500]/30 bg-white px-4 py-2 text-xs font-bold text-[#121212] transition-all hover:border-[#fb8500] hover:bg-[#fff3ec]/50 hover:text-[#fb8500] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  Change image
                </button>

                <button
                  type="button"
                  onClick={removeImage}
                  disabled={disabled}
                  className="rounded-xl bg-gray-100 px-4 py-2 text-xs font-bold text-[#555555] transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                >
                  Remove image
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => {
            if (!disabled) inputRef.current?.click();
          }}
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-label="Click to upload image"
          onKeyDown={(event) => {
            if (
              !disabled &&
              (event.key === "Enter" || event.key === " ")
            ) {
              event.preventDefault();
              inputRef.current?.click();
            }
          }}
          className={`border-2 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center text-center transition-all duration-300 group ${
            isDragging
              ? "border-[#fb8500] bg-[#fff3ec] shadow-md"
              : "border-[#fb8500]/40 hover:border-[#fb8500] bg-[#fff3ec]/30 hover:shadow-md hover:shadow-[#fb8500]/5"
          } ${
            disabled
              ? "cursor-not-allowed opacity-50"
              : "cursor-pointer"
          }`}
        >
          <div className="p-4 bg-[#fff3ec] text-[#fb8500] rounded-2xl border border-[#fb8500]/30 mb-4 group-hover:scale-110 group-hover:bg-[#fb8500] group-hover:text-white transition-all duration-300 shadow-sm">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              className="h-8 w-8"
              aria-hidden="true"
            >
              <path
                d="M12 16V4m0 0L7 9m5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <span className="text-base font-black text-[#121212] mb-1 group-hover:text-[#fb8500] transition-colors">
            Click to upload image
          </span>

          <span className="text-xs font-medium text-[#777777]">
            or drag and drop your image here
          </span>

          <span className="mt-4 text-xs text-[#777777]">
            JPG, PNG or WebP · Maximum 10 MB
          </span>
        </div>
      )}

      {error && (
        <p role="alert" className="text-xs font-bold text-red-600 px-1">
          ⚠️ {error}
        </p>
      )}
    </div>
  );
}
