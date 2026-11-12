
"use client";

import { useState } from "react";

interface BeforeAfterPreviewProps {
  originalUrl: string | null;
  enhancedUrl: string;
}

export default function BeforeAfterPreview({
  originalUrl,
  enhancedUrl,
}: BeforeAfterPreviewProps) {
  const [view, setView] = useState<"side-by-side" | "original" | "enhanced">(
    "side-by-side"
  );

  const [originalLoaded, setOriginalLoaded] = useState(false);
  const [enhancedLoaded, setEnhancedLoaded] = useState(false);
  const [originalError, setOriginalError] = useState(false);
  const [enhancedError, setEnhancedError] = useState(false);

  if (!originalUrl || !enhancedUrl) {
    return (
      <div className="rounded-xl border bg-muted/30 p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Image preview is not available.
        </p>
      </div>
    );
  }

  const renderImage = (
    src: string,
    alt: string,
    loaded: boolean,
    onLoad: () => void,
    onError: () => void
  ) => (
    <div className="relative flex min-h-64 items-center justify-center overflow-hidden rounded-xl bg-muted/40">
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs text-muted-foreground">
            Loading preview...
          </span>
        </div>
      )}

      <img
        src={src}
        alt={alt}
        onLoad={onLoad}
        onError={onError}
        className={`max-h-[500px] w-full object-contain transition-opacity ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
      />

      {!loaded && (
        <span className="sr-only">Loading {alt}</span>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* View selector */}
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["side-by-side", "Side by side"],
            ["original", "Original"],
            ["enhanced", "Enhanced"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setView(value)}
            aria-pressed={view === value}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              view === value
                ? "bg-primary text-primary-foreground"
                : "border bg-background hover:bg-muted"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Comparison */}
      <div
        className={
          view === "side-by-side"
            ? "grid grid-cols-1 gap-4 md:grid-cols-2"
            : "grid grid-cols-1"
        }
      >
        {(view === "side-by-side" || view === "original") && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Original image</h3>

            {originalError ? (
              <div className="flex min-h-64 items-center justify-center rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
                Original image could not be loaded.
              </div>
            ) : (
              renderImage(
                originalUrl,
                "Original image",
                originalLoaded,
                () => setOriginalLoaded(true),
                () => setOriginalError(true)
              )
            )}
          </div>
        )}

        {(view === "side-by-side" || view === "enhanced") && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Enhanced image</h3>

            {enhancedError ? (
              <div className="flex min-h-64 items-center justify-center rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
                Enhanced image could not be loaded.
              </div>
            ) : (
              renderImage(
                enhancedUrl,
                "Enhanced image",
                enhancedLoaded,
                () => setEnhancedLoaded(true),
                () => setEnhancedError(true)
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
