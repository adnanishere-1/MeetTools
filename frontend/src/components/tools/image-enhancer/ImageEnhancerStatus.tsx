
"use client";

export type ImageEnhancerStatusType =
  | "idle"
  | "uploading"
  | "queued"
  | "processing"
  | "completed"
  | "failed";

interface ImageEnhancerStatusProps {
  status: ImageEnhancerStatusType;
  error?: string | null;
}

const statusConfig: Record<
  Exclude<ImageEnhancerStatusType, "idle">,
  {
    title: string;
    description: string;
    className: string;
    icon: string;
  }
> = {
  uploading: {
    title: "Uploading image",
    description: "Your image is being uploaded securely.",
    className: "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300",
    icon: "↑",
  },
  queued: {
    title: "Added to processing queue",
    description: "Your image is waiting to be processed.",
    className: "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300",
    icon: "◷",
  },
  processing: {
    title: "Enhancing your image",
    description: "Please wait while your image is being enhanced.",
    className: "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300",
    icon: "⟳",
  },
  completed: {
    title: "Enhancement completed",
    description: "Your enhanced image is ready.",
    className: "border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/30 dark:text-green-300",
    icon: "✓",
  },
  failed: {
    title: "Enhancement failed",
    description: "We couldn't enhance your image. Please try again.",
    className: "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300",
    icon: "!",
  },
};

export default function ImageEnhancerStatus({
  status,
  error,
}: ImageEnhancerStatusProps) {
  if (status === "idle") {
    return null;
  }

  const config = statusConfig[status];

  const description =
    status === "failed" && error
      ? error
      : config.description;

  const isProcessing =
    status === "uploading" ||
    status === "queued" ||
    status === "processing";

  return (
    <div
      role={status === "failed" ? "alert" : "status"}
      aria-live={status === "failed" ? "assertive" : "polite"}
      className={`flex items-start gap-3 rounded-xl border p-4 ${config.className}`}
    >
      <span
        aria-hidden="true"
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-current/10 text-lg font-bold ${
          status === "processing" ? "animate-spin" : ""
        }`}
      >
        {config.icon}
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">
          {config.title}
        </p>

        <p className="mt-1 break-words text-xs opacity-80">
          {description}
        </p>

        {isProcessing && (
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-current/15">
            <div className="h-full w-1/3 animate-pulse rounded-full bg-current" />
          </div>
        )}
      </div>
    </div>
  );
}
