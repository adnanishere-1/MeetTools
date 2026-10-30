
"use client";

import React, {
  useState,
  useEffect,
  useRef,
} from "react";

import Navbar from "@/components/layout/Navbar";

import {
  CropIcon,
  UploadSimpleIcon,
  ArrowLeftIcon,
  SlidersHorizontalIcon,
  FileTextIcon, FilePdfIcon, FileArchiveIcon, WrenchIcon, ImagesIcon, CropIcon as CropToolIcon, PaintBrushIcon, ArrowsClockwiseIcon, FileMinusIcon, FilePlusIcon, MagicWandIcon, ShieldCheckIcon, LightningIcon, SparkleIcon,
} from "@phosphor-icons/react/dist/ssr";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useImageResize } from "@/hooks/useImageResize";
import axios from "axios";
import { toast } from "sonner";

const upcomingToolsSections = [
  {
    sectionTitle: "PDF Tools",
    sectionIcon: FilePdfIcon,
    tools: [
      { name: "PDF Converter", description: "Convert images & documents to PDF instantly.", icon: FileTextIcon, badge: "Coming Soon" },
      { name: "PDF Merge", description: "Combine multiple PDFs into one clean file.", icon: FilePlusIcon, badge: "On the Way" },
      { name: "PDF Split", description: "Extract pages or split a PDF by page ranges.", icon: FileMinusIcon, badge: "Coming Soon" },
      { name: "PDF Compress", description: "Shrink PDF size without losing quality.", icon: FileArchiveIcon, badge: "In Progress" },
    ],
  },
  {
    sectionTitle: "Image Tools",
    sectionIcon: ImagesIcon,
    tools: [
      { name: "AI Image Enhancer", description: "Upscale and enhance image quality with AI.", icon: MagicWandIcon, badge: "Coming Soon" },
      { name: "Image Compressor", description: "Reduce image size up to 90% lossless.", icon: LightningIcon, badge: "On the Way" },
      { name: "Background Remover", description: "Remove backgrounds automatically in seconds.", icon: PaintBrushIcon, badge: "Coming Soon" },
      { name: "Smart Crop", description: "Auto-crop images for social media presets.", icon: CropToolIcon, badge: "In Progress" },
    ],
  },
  {
    sectionTitle: "Compression & Archive",
    sectionIcon: FileArchiveIcon,
    tools: [
      { name: "Bulk ZIP Compressor", description: "Compress many files into a single ZIP.", icon: FileArchiveIcon, badge: "Coming Soon" },
      { name: "Batch Format Converter", description: "Convert hundreds of files in one go.", icon: ArrowsClockwiseIcon, badge: "On the Way" },
      { name: "Document Optimizer", description: "Optimize docs for web & email sharing.", icon: ShieldCheckIcon, badge: "Coming Soon" },
      { name: "Video Compressor", description: "Lightweight video compression online.", icon: SparkleIcon, badge: "Planned" },
    ],
  },
];

interface JobFile {
  url?: string;
  fileName?: string;
}

interface JobData {
  inputFiles?: JobFile[];
  outputFiles?: JobFile[];
}

interface CompletedResizeResult {
  status: string;
  previewUrl?: string;
  downloadUrl?: string;
  fileDetails?: {
    fileName?: string;
  };
}

export default function ImageResizeTool() {
  const [activeToolTab, setActiveToolTab] = useState<"resize" | "coming-soon">("resize");
  const [file, setFile] = useState<File | null>(null);

  const [previewImage, setPreviewImage] =
    useState<string | null>(null);

  const [width, setWidth] = useState("800");
  const [height, setHeight] = useState("600");

  const [format, setFormat] = useState<
    "jpeg" | "png" | "webp" | "avif"
  >("webp");

  const [quality, setQuality] = useState("90");

  const [isDownloading, setIsDownloading] =
    useState(false);

  const lastHookError = useRef<string | null>(null);

  const searchParams = useSearchParams();
  const jobId = searchParams.get("jobId");

  const {
    handleResize,
    loading,
    progressMessage,
    result,
    error,
    resetResize,
  } = useImageResize();

  const resultRef = useRef<HTMLDivElement>(null);

  // Show processing errors as friendly toast notifications, not raw API errors.
  useEffect(() => {
    if (!error) {
      lastHookError.current = null;
      return;
    }
    if (lastHookError.current === error) return;
    lastHookError.current = error;
    toast.error("Image processing failed", {
      description: "Please check your image and settings, then try again.",
    });
  }, [error]);

  // Load an existing image from backend job history
  useEffect(() => {
    if (!jobId) return;

    let cancelled = false;
    let objectUrl: string | null = null;

    const fetchJobData = async () => {


      try {
        // HttpOnly cookie sent automatically
        // No localStorage or Bearer token
        const response = await axios.get(
          `/api/v1/jobs/${encodeURIComponent(jobId)}`,
          {
            withCredentials: true,
          }
        );

        const jobData: JobData =
          response.data?.job || response.data;

        const targetFile =
          jobData.outputFiles?.[0] ||
          jobData.inputFiles?.[0];

        if (!targetFile?.url) {
          if (!cancelled) {
            toast.error("Image unavailable", {
              description: "No image was found for this job.",
            });
          }
          return;
        }

        const jobImageUrl = new URL(
          targetFile.url,
          window.location.origin
        );
        if (!["http:", "https:"].includes(jobImageUrl.protocol)) {
          throw new Error("Invalid image URL");
        }
        const fileResponse = await fetch(jobImageUrl.href, {
          credentials:
            jobImageUrl.origin === window.location.origin
              ? "include"
              : "omit",
        });

        if (!fileResponse.ok) {
          throw new Error(
            "Unable to load the image from job history."
          );
        }

        const blob = await fileResponse.blob();

        if (cancelled) return;

        const originalFile = new File(
          [blob],
          targetFile.fileName ||
            "datastore-image.webp",
          {
            type: blob.type || "image/webp",
          }
        );

        objectUrl = URL.createObjectURL(blob);

        setFile(originalFile);
        setPreviewImage(objectUrl);
      } catch {
        if (cancelled) return;

        toast.error("Unable to load image", {
          description: "Please try opening this job again.",
        });
      }
    };

    void fetchJobData();

    return () => {
      cancelled = true;

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [jobId]);

  // Scroll to completed result
  useEffect(() => {
    if (result?.status === "completed") {
      resultRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [result]);

  // Handle local image selection
  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const uploadedFile = e.target.files?.[0];

    if (!uploadedFile) return;

    resetResize();

    setFile(uploadedFile);

    const reader = new FileReader();

    reader.onload = (event) => {
      setPreviewImage(
        event.target?.result as string
      );
    };

    reader.readAsDataURL(uploadedFile);
  };

  // Start real backend image resize job
  const handleExecuteResize = async () => {
    if (!file) {
      toast.warning("Select an image first", {
        description: "Upload an image to continue.",
      });
      return;
    }

    const numericQuality = Math.min(
      Math.max(Number(quality) || 90, 10),
      100
    );

    const numericWidth = width
      ? Number(width)
      : undefined;

    const numericHeight = height
      ? Number(height)
      : undefined;

    if (
      (numericWidth !== undefined &&
        (!Number.isInteger(numericWidth) ||
          numericWidth <= 0)) ||
      (numericHeight !== undefined &&
        (!Number.isInteger(numericHeight) ||
          numericHeight <= 0))
    ) {
      toast.warning("Invalid dimensions", {
        description: "Width and height must be positive whole numbers.",
      });
      return;
    }

    try {
      await handleResize(file, {
        width: numericWidth,
        height: numericHeight,
        format,
        quality: numericQuality,
      });
    } catch {
      // The hook exposes errors through its error state.
      // Avoid throwing into the Next.js development overlay.
      toast.error("Unable to process image", {
        description: "Please try again in a moment.",
      });
    }
  };

  // Download the processed image. CDN fetch may be blocked by CORS.
  const handleDownloadImage = async (
    url: string,
    filename: string
  ) => {
    if (!url) {
      toast.error("Download unavailable", {
        description: "The processed image link is missing.",
      });
      return;
    }
    if (isDownloading) return;

    let downloadUrl: URL;
    try {
      downloadUrl = new URL(url, window.location.origin);
      if (!["http:", "https:"].includes(downloadUrl.protocol)) {
        throw new Error("Unsupported URL protocol");
      }
    } catch {
      toast.error("Invalid download link");
      return;
    }

    setIsDownloading(true);
    let blobUrl: string | null = null;

    try {
      const sameOrigin =
        downloadUrl.origin === window.location.origin;
      const response = await fetch(downloadUrl.href, {
        credentials: sameOrigin ? "include" : "omit",
      });

      if (!response.ok) throw new Error("Download unavailable");
      const blob = await response.blob();
      blobUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename || `resized-image.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success("Download started");
    } catch {
      // External CDN URLs may disallow cross-origin fetch.
      // Opening the link avoids a JavaScript CORS read, but the
      // browser/CDN may display the image rather than download it.
      if (downloadUrl.origin !== window.location.origin) {
        window.open(
          downloadUrl.href,
          "_blank",
          "noopener,noreferrer"
        );
        toast.info("Image opened in a new tab", {
          description:
            "If it opens as a preview, use your browser's Save Image option.",
        });
      } else {
        toast.error("Download failed", {
          description: "Please try again in a moment.",
        });
      }
    } finally {
      if (blobUrl) {
        const urlToRevoke = blobUrl;
        window.setTimeout(() => URL.revokeObjectURL(urlToRevoke), 1500);
      }
      setIsDownloading(false);
    }
  };

  // Clear selected image
  const handleChangeImage = () => {
    resetResize();
    setFile(null);
    setPreviewImage(null);

  };

  useEffect(() => {
    if (result?.status === "completed") {
      toast.success("Image processed successfully", {
        description: "Your resized image is ready to download.",
        id: "resize-completed",
      });
    }
  }, [result]);

  const completedResult =
    result?.status === "completed"
      ? (result as CompletedResizeResult)
      : null;

  return (
    <div className="min-h-screen flex flex-col bg-[#fff3ec] text-[#121212] font-sans">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto px-6 py-12 w-full">
        <Link
          href="/tools"
          className="inline-flex items-center gap-2 text-sm font-bold text-[#555555] hover:text-[#fb8500] transition-colors mb-8"
        >
          <ArrowLeftIcon size={18} />
          Back to Tools
        </Link>

        <div className="bg-white rounded-3xl p-8 border border-[#fb8500]/20 shadow-xl shadow-[#fb8500]/5">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8 pb-6 border-b border-[#fb8500]/10">
            <div className="p-3 bg-[#fb8500]/10 text-[#fb8500] rounded-2xl border border-[#fb8500]/20">
              <CropIcon
                size={28}
                weight="duotone"
              />
            </div>

            <div>
              <h1 className="text-2xl font-black text-[#121212]">
                Image Resize & Compress Utility
              </h1>

              <p className="text-sm text-[#555555]">
                Powered by backend database records
                & background worker queue.
              </p>
            </div>
          </div>

          {/* Workspace tabs — upcoming tools are display-only */}
          <div className="flex flex-wrap items-center gap-2 mb-6 bg-[#fff3ec] p-1.5 rounded-2xl border border-[#fb8500]/20 w-fit">
            <button type="button" onClick={() => setActiveToolTab("resize")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeToolTab === "resize" ? "bg-[#fb8500] text-white shadow-md" : "text-[#555555] hover:text-[#fb8500]"}`}>
              Resize & Format
            </button>
            <button type="button" onClick={() => setActiveToolTab("coming-soon")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeToolTab === "coming-soon" ? "bg-[#fb8500] text-white shadow-md" : "text-[#555555] hover:text-[#fb8500]"}`}>
              Coming Soon Tools
            </button>
          </div>

          {activeToolTab === "resize" ? (
            <>
          {/* Image Upload */}
          {!file ? (
            <label className="border-2 border-dashed border-[#fb8500]/40 hover:border-[#fb8500] rounded-3xl p-12 flex flex-col items-center justify-center cursor-pointer bg-[#fff3ec]/30 transition-all group">
              <div className="p-4 bg-[#fb8500]/10 text-[#fb8500] rounded-2xl mb-4 group-hover:scale-110 transition-transform">
                <UploadSimpleIcon
                  size={32}
                  weight="duotone"
                />
              </div>

              <span className="text-base font-bold text-[#121212] mb-1">
                Click to upload image
              </span>

              <span className="text-xs text-[#777777]">
                PNG, JPG, WEBP, or AVIF supported
              </span>

              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/avif"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row gap-8 items-center bg-[#fff3ec]/40 p-6 rounded-2xl border border-[#fb8500]/20">
                {/* Image Preview */}
                <div className="w-full md:w-1/2 flex justify-center">
                  {previewImage && (
                    <img
                      src={previewImage}
                      alt="Selected Preview"
                      className="max-h-60 object-contain rounded-xl shadow-md border border-[#fb8500]/20"
                    />
                  )}
                </div>

                {/* Resize Controls */}
                <div className="w-full md:w-1/2 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#333333] mb-1 uppercase tracking-wider">
                        Width (px)
                      </label>

                      <input
                        type="number"
                        min="1"
                        value={width}
                        onChange={(e) =>
                          setWidth(e.target.value)
                        }
                        placeholder="e.g. 800"
                        className="w-full px-4 py-2.5 bg-white border border-[#fb8500]/20 rounded-xl text-sm font-bold focus:outline-none focus:border-[#fb8500]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#333333] mb-1 uppercase tracking-wider">
                        Height (px)
                      </label>

                      <input
                        type="number"
                        min="1"
                        value={height}
                        onChange={(e) =>
                          setHeight(e.target.value)
                        }
                        placeholder="e.g. 600"
                        className="w-full px-4 py-2.5 bg-white border border-[#fb8500]/20 rounded-xl text-sm font-bold focus:outline-none focus:border-[#fb8500]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#333333] mb-1 uppercase tracking-wider">
                        Format
                      </label>

                      <select
                        value={format}
                        onChange={(e) =>
                          setFormat(
                            e.target.value as
                              | "jpeg"
                              | "png"
                              | "webp"
                              | "avif"
                          )
                        }
                        className="w-full px-4 py-2.5 bg-white border border-[#fb8500]/20 rounded-xl text-sm font-bold focus:outline-none focus:border-[#fb8500]"
                      >
                        <option value="webp">
                          WebP
                        </option>
                        <option value="jpeg">
                          JPEG
                        </option>
                        <option value="png">
                          PNG
                        </option>
                        <option value="avif">
                          AVIF
                        </option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#333333] mb-1 uppercase tracking-wider">
                        Quality (10-100)
                      </label>

                      <input
                        type="number"
                        min="10"
                        max="100"
                        value={quality}
                        onChange={(e) =>
                          setQuality(e.target.value)
                        }
                        className="w-full px-4 py-2.5 bg-white border border-[#fb8500]/20 rounded-xl text-sm font-bold focus:outline-none focus:border-[#fb8500]"
                      />
                    </div>
                  </div>

                  {/* Resize Button */}
                  <button
                    type="button"
                    onClick={
                      handleExecuteResize
                    }
                    disabled={loading}
                    className="w-full py-3.5 bg-[#fb8500] hover:bg-[#e07600] text-white font-bold rounded-xl transition-all shadow-lg shadow-[#fb8500]/30 flex items-center justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
                  >
                    <SlidersHorizontalIcon
                      size={18}
                      weight="bold"
                    />

                    {loading
                      ? "Processing Background Job..."
                      : "Resize & Compress Image"}
                  </button>

                  {/* Change Image */}
                  <button
                    type="button"
                    onClick={
                      handleChangeImage
                    }
                    disabled={loading}
                    className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-[#555555] font-bold rounded-xl transition-colors text-xs cursor-pointer disabled:opacity-50"
                  >
                    Upload Different Image
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Processing Indicator */}
          {loading && (
            <div className="mt-6 p-6 bg-orange-50 border border-orange-200 rounded-2xl text-center space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#fb8500] mx-auto" />

              <p className="text-sm font-bold text-orange-800">
                {progressMessage ||
                  "Processing image in background queue..."}
              </p>
            </div>
          )}


          {/* Completed Result */}
          <div ref={resultRef}>
            {completedResult && (
              <div className="mt-6 p-6 bg-green-50 border border-green-200 rounded-2xl space-y-4 text-center">
                <h3 className="text-base font-black text-green-800">
                  ✅ Image Processed Successfully via
                  Datastore!
                </h3>

                <div className="flex justify-center my-2">
                  {completedResult.previewUrl && (
                    <img
                      src={
                        completedResult.previewUrl
                      }
                      alt="Resized Result"
                      className="max-h-52 rounded-xl shadow-md border border-green-200"
                    />
                  )}
                </div>

                <button
                  type="button"
                  disabled={
                    isDownloading ||
                    !completedResult.downloadUrl
                  }
                  onClick={() =>
                    handleDownloadImage(
                      completedResult.downloadUrl || "",
                      completedResult.fileDetails
                        ?.fileName ||
                        `compressed-image.${format}`
                    )
                  }
                  className="block text-center w-full py-3.5 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-green-600/30 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isDownloading
                    ? "Downloading..."
                    : "Download Processed Image"}
                </button>
              </div>
            )}
          </div>
            </>
          ) : (
            <div className="space-y-6">
              <div className="bg-[#fff3ec]/40 p-5 rounded-2xl border border-[#fb8500]/20">
                <div className="flex items-center gap-2 text-sm font-bold text-[#121212] mb-1">
                  <WrenchIcon size={20} className="text-[#fb8500]" /> Multiple Tools Coming Soon
                </div>
                <p className="text-xs text-[#555555] leading-relaxed">
                  We are building a full toolbox. Below are the upcoming tools — each section will unlock soon. Stay tuned!
                </p>
              </div>
              <div className="space-y-5 max-h-[420px] overflow-y-auto pr-1">
                {upcomingToolsSections.map((section) => {
                  const SectionIcon = section.sectionIcon;
                  return (
                    <div key={section.sectionTitle} className="space-y-2.5">
                      <div className="flex items-center gap-2 px-1">
                        <SectionIcon size={16} className="text-[#fb8500]" weight="bold" />
                        <h3 className="text-xs font-black text-[#121212] uppercase tracking-wider">{section.sectionTitle}</h3>
                        <div className="flex-1 h-px bg-[#fb8500]/15" />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {section.tools.map((tool) => {
                          const ToolIcon = tool.icon;
                          return (
                            <div key={tool.name} className="flex flex-col p-3 rounded-xl bg-white border border-[#fb8500]/20 shadow-sm" aria-disabled="true">
                              <div className="flex items-center justify-between gap-2 mb-1.5">
                                <div className="flex items-center gap-2 text-xs font-bold text-[#121212]">
                                  <ToolIcon size={16} className="text-[#fb8500]" />{tool.name}
                                </div>
                                <span className="px-2 py-0.5 rounded-full bg-[#fb8500]/10 text-[#fb8500] text-[9px] font-bold border border-[#fb8500]/20 whitespace-nowrap">{tool.badge}</span>
                              </div>
                              <p className="text-[10px] text-[#555555] leading-relaxed">{tool.description}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
