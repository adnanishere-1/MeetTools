"use client";

import { useState, useEffect, useRef, type FormEvent } from "react";
import { useParams } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import { ArrowLeftIcon, DownloadSimpleIcon, SlidersHorizontalIcon, SpinnerIcon, SparkleIcon, FileTextIcon, FilePdfIcon, FileArchiveIcon, WrenchIcon, ImagesIcon, CropIcon, PaintBrushIcon, ArrowsClockwiseIcon, FileMinusIcon, FilePlusIcon, MagicWandIcon, ShieldCheckIcon, LightningIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import axios from "axios";
import { imageService, type ResizeOptions } from "@/services/imageService";
import { fetchJobById } from "@/services/jobService";

// ─────────────────────────────────────────────────────────────
// 🛠️ UPCOMING TOOLS DATA — Section wise (display only, no action)
// ─────────────────────────────────────────────────────────────
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
      { name: "Smart Crop", description: "Auto-crop images for social media presets.", icon: CropIcon, badge: "In Progress" },
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

interface StoredFile { url?: string; fileName?: string; }
interface StoredJob {
  inputFiles?: StoredFile[];
  outputFiles?: StoredFile[];
  options?: { width?: number; height?: number; outputFormat?: string; format?: string; quality?: number };
}
type OutputFormat = NonNullable<ResizeOptions["format"]>;

function getMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.error?.message || error.response?.data?.message || fallback;
  }
  return error instanceof Error ? error.message : fallback;
}

export default function MultiToolWorkspacePage() {
  const params = useParams();
  const jobId = typeof params?.id === "string" ? params.id : "";
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [jobData, setJobData] = useState<StoredJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState("resize");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [format, setFormat] = useState<OutputFormat>("webp");
  const [quality, setQuality] = useState("90");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [downloadName, setDownloadName] = useState<string | null>(null);
  const [progressMessage, setProgressMessage] = useState("");
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestVersion = useRef(0);
  const mounted = useRef(true);
  const busy = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      requestVersion.current += 1;
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setJobData(null);
    const loadJobDetails = async () => {
      if (!jobId) {
        setError("Job ID is missing.");
        setLoading(false);
        return;
      }
      try {
        // Cookie-based authentication is handled by jobService.
        const response = await fetchJobById(jobId);
        if (cancelled) return;
        const job: StoredJob = response?.job || response?.data?.job || response?.data || response;
        if (!job || !job.inputFiles?.[0]?.url) throw new Error("Source asset not found.");
        setJobData(job);
        if (job.options) {
          setWidth(job.options.width != null ? String(job.options.width) : "");
          setHeight(job.options.height != null ? String(job.options.height) : "");
          const originalFormat = job.options.outputFormat || job.options.format || "webp";
          setFormat((originalFormat === "jpg" ? "jpeg" : originalFormat) as OutputFormat);
          setQuality(job.options.quality != null ? String(job.options.quality) : "90");
        }
      } catch (err: unknown) {
        if (!cancelled) setError(getMessage(err, "Failed to load job details or job not found."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void loadJobDetails();
    return () => { cancelled = true; };
  }, [jobId]);

  const pollJobStatus = (backgroundJobId: string, version: number) => {
    const check = async () => {
      if (!mounted.current || requestVersion.current !== version) return;
      try {
        const data = await imageService.checkJobStatus(backgroundJobId);
        if (!mounted.current || requestVersion.current !== version) return;
        if (data.status === "completed") {
          const output = data as typeof data & { downloadUrl?: string; result?: { downloadUrl?: string; fileDetails?: { fileName?: string } }; fileDetails?: { fileName?: string } };
          const url = output.downloadUrl || output.result?.downloadUrl;
          if (!url) throw new Error("Processing completed but download URL was not returned.");
          setResultUrl(url);
          setDownloadName(output.fileDetails?.fileName || output.result?.fileDetails?.fileName || null);
          setProgressMessage("Processing completed successfully.");
          setProcessing(false);
          busy.current = false;
          return;
        }
        if (data.status === "failed") throw new Error(data.failedReason || "Image processing failed.");
        setProgressMessage("Background worker is processing your image...");
        pollTimer.current = setTimeout(check, 2000);
      } catch (err: unknown) {
        if (!mounted.current || requestVersion.current !== version) return;
        setError(getMessage(err, "Unable to check job status."));
        setProcessing(false);
        busy.current = false;
      }
    };
    pollTimer.current = setTimeout(check, 2000);
  };

  const handleToolSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (activeTool !== "resize" || busy.current) return;
    const source = jobData?.inputFiles?.[0];
    if (!source?.url) { setError("Source image is unavailable."); return; }
    const parsedWidth = width.trim() ? Number(width) : undefined;
    const parsedHeight = height.trim() ? Number(height) : undefined;
    if ([parsedWidth, parsedHeight].some(v => v !== undefined && (!Number.isInteger(v) || v <= 0))) {
      setError("Width and height must be positive whole numbers.");
      return;
    }
    busy.current = true;
    requestVersion.current += 1;
    const version = requestVersion.current;
    if (pollTimer.current) clearTimeout(pollTimer.current);
    setProcessing(true);
    setError(null);
    setResultUrl(null);
    setDownloadName(null);
    setProgressMessage("Loading original image...");
    try {
      const imageResponse = await fetch(source.url, { credentials: "include" });
      if (!imageResponse.ok) throw new Error("Failed to fetch original image.");
      const blob = await imageResponse.blob();
      if (!mounted.current || requestVersion.current !== version) return;
      const file = new File([blob], source.fileName || "image.jpg", { type: blob.type || "image/jpeg" });
      setProgressMessage("Uploading image to processing queue...");
      const response = await imageService.resizeImage(file, {
        width: parsedWidth, height: parsedHeight, format, quality: Math.min(100, Math.max(10, Number(quality) || 90)),
      });
      if (!mounted.current || requestVersion.current !== version) return;
      if (response.jobId) {
        setProgressMessage("Image queued. Waiting for background worker...");
        pollJobStatus(String(response.jobId), version);
      } else {
        throw new Error("Backend did not return a processing job ID.");
      }
    } catch (err: unknown) {
      if (!mounted.current || requestVersion.current !== version) return;
      setError(getMessage(err, "Failed to process image."));
      setProcessing(false);
      busy.current = false;
    }
  };

  const handleDirectDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) throw new Error("Download failed.");
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (err: unknown) {
      setError(getMessage(err, "Unable to download the processed file."));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#fff3ec] text-[#121212]">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-3 text-[#fb8500] font-bold text-lg">
            <SpinnerIcon size={32} className="animate-spin" />
            Loading workspace...
          </div>
        </div>
      </div>
    );
  }

  if (error || !jobData) {
    return (
      <div className="min-h-screen flex flex-col bg-[#fff3ec] text-[#121212]">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <h1 className="text-3xl font-black mb-4">Asset Not Found</h1>
          <p className="text-[#555555] mb-6">{error || "The requested asset could not be loaded."}</p>
          <Link href="/dashboard" className="px-6 py-3 rounded-xl bg-[#fb8500] text-white font-bold shadow-lg">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const originalImageUrl = jobData.inputFiles?.[0]?.url;

  return (
    <div className="min-h-screen flex flex-col bg-[#fff3ec] text-[#121212] font-sans">
      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto px-6 py-12 w-full">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-bold text-[#555555] hover:text-[#fb8500] mb-8 transition-colors">
          <ArrowLeftIcon size={18} weight="bold" />
          Back to Dashboard
        </Link>

        <div className="bg-white p-8 rounded-3xl border border-[#fb8500]/20 shadow-xl shadow-[#fb8500]/5">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 pb-4 border-b border-[#fb8500]/10 gap-4">
            <div>
              <h1 className="text-2xl font-black text-[#121212]">Unified Multi-Tool Workspace</h1>
              <p className="text-xs text-[#555555] mt-1">Switch tools instantly and re-process your asset on a single page.</p>
            </div>

            {/* Modular Tool Switcher Tabs */}
            <div className="flex items-center bg-[#fff3ec] p-1.5 rounded-2xl border border-[#fb8500]/20 gap-1">
              <button
                onClick={() => {
                  setActiveTool("resize");
                  setResultUrl(null);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTool === "resize" ? "bg-[#fb8500] text-white shadow-md" : "text-[#555555] hover:text-[#fb8500]"
                }`}
              >
                Resize & Format
              </button>
              <button
                onClick={() => {
                  setActiveTool("coming-soon");
                  setResultUrl(null);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTool === "coming-soon" ? "bg-[#fb8500] text-white shadow-md" : "text-[#555555] hover:text-[#fb8500]"
                }`}
              >
                Coming Soon Tools
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            {/* Left Column: Asset Preview */}
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-[#121212]">Source Asset Preview</h2>
              <div className="w-full h-72 bg-[#fff3ec] rounded-2xl border-2 border-dashed border-[#fb8500]/30 flex items-center justify-center overflow-hidden relative">
                {originalImageUrl ? (
                  <img src={originalImageUrl} alt="Original" className="max-h-full max-w-full object-contain p-2" />
                ) : (
                  <span className="text-xs text-[#555555]">No preview available</span>
                )}
              </div>
              <p className="text-xs text-[#555555]">
                File: <strong className="text-[#121212]">{jobData.inputFiles?.[0]?.fileName || "Asset"}</strong>
              </p>
            </div>

            {/* Right Column: Dynamic Content based on Active Tab */}
            {activeTool === "resize" ? (
              /* ─────────────────────────────────────────────
                 ✅ RESIZE TAB — Full working section
                 (Process & Export button sirf YAHAN show hota hai)
              ───────────────────────────────────────────── */
              <form onSubmit={handleToolSubmit} className="space-y-6">
                <div className="space-y-4 animate-fade-in">
                  <h2 className="text-sm font-bold text-[#121212] flex items-center gap-2">
                    <SlidersHorizontalIcon size={18} className="text-[#fb8500]" /> Resize & Export Configurations
                  </h2>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#555555] mb-1">Width (px)</label>
                      <input
                        type="number"
                        value={width}
                        onChange={(e) => setWidth(e.target.value)}
                        placeholder="e.g. 800"
                        className="w-full px-4 py-2.5 rounded-xl border border-[#fb8500]/30 focus:outline-none focus:border-[#fb8500] text-sm bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#555555] mb-1">Height (px)</label>
                      <input
                        type="number"
                        value={height}
                        onChange={(e) => setHeight(e.target.value)}
                        placeholder="e.g. 600"
                        className="w-full px-4 py-2.5 rounded-xl border border-[#fb8500]/30 focus:outline-none focus:border-[#fb8500] text-sm bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#555555] mb-1">Format</label>
                      <select
                        value={format}
                        onChange={(e) => setFormat(e.target.value as OutputFormat)}
                        className="w-full px-4 py-2.5 rounded-xl border border-[#fb8500]/30 focus:outline-none focus:border-[#fb8500] text-sm bg-white"
                      >
                        <option value="jpeg">JPG</option>
                        <option value="png">PNG</option>
                        <option value="avif">AVIF</option>
                        <option value="webp">WEBP</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#555555] mb-1">Quality ({quality}%)</label>
                      <input
                        type="range"
                        min="10"
                        max="100"
                        value={quality}
                        onChange={(e) => setQuality(e.target.value)}
                        className="w-full mt-2 accent-[#fb8500]"
                      />
                    </div>
                  </div>
                </div>

                {/* ⭐ Process & Export — SIRF Resize tab mein */}
                <button
                  type="submit"
                  disabled={processing || !jobData?.inputFiles?.[0]?.url}
                  className="w-full mt-4 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#fb8500] hover:bg-[#e07600] text-white font-bold transition-all shadow-lg shadow-[#fb8500]/30 cursor-pointer disabled:opacity-50"
                >
                  {processing ? (
                    <>
                      <SpinnerIcon size={20} className="animate-spin" />
                      Processing Asset...
                    </>
                  ) : (
                    <>
                      <SlidersHorizontalIcon size={20} weight="bold" />
                      Process & Export Asset
                    </>
                  )}
                </button>

                {progressMessage && processing && <p className="text-xs text-[#fb8500] text-center">{progressMessage}</p>}
                {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
                {resultUrl && (
                  <div className="mt-6 p-4 rounded-2xl bg-[#fff3ec] border border-[#fb8500]/30 text-center animate-fade-in">
                    <p className="text-xs font-bold text-[#fb8500] mb-2">🎉 Processed Successfully!</p>
                    <button
                      type="button"
                      onClick={() => handleDirectDownload(resultUrl, downloadName || `processed-image.${format === "jpeg" ? "jpg" : format}`)}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#121212] hover:bg-black text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                    >
                      <DownloadSimpleIcon size={16} weight="bold" />
                      Download Final File Directly
                    </button>
                  </div>
                )}
              </form>
            ) : (
              /* ─────────────────────────────────────────────
                 🔜 COMING SOON TAB — Section-wise tools display
                 (Sirf display — koi button/action NAHI)
              ───────────────────────────────────────────── */
              <div className="space-y-6 animate-fade-in">
                {/* Heading */}
                <div className="bg-[#fff3ec]/40 p-5 rounded-2xl border border-[#fb8500]/20">
                  <div className="flex items-center gap-2 text-sm font-bold text-[#121212] mb-1">
                    <WrenchIcon size={20} className="text-[#fb8500]" /> Multiple Tools Coming Soon
                  </div>
                  <p className="text-xs text-[#555555] leading-relaxed">
                    We are building a full toolbox. Below are the upcoming tools — each section will unlock soon. Stay tuned!
                  </p>
                </div>

                {/* Section-wise upcoming tools */}
                <div className="space-y-5 max-h-[420px] overflow-y-auto pr-1">
                  {upcomingToolsSections.map((section, sIdx) => {
                    const SectionIcon = section.sectionIcon;
                    return (
                      <div key={sIdx} className="space-y-2.5">
                        {/* Section Heading */}
                        <div className="flex items-center gap-2 px-1">
                          <SectionIcon size={16} className="text-[#fb8500]" weight="bold" />
                          <h3 className="text-xs font-black text-[#121212] uppercase tracking-wider">
                            {section.sectionTitle}
                          </h3>
                          <div className="flex-1 h-px bg-[#fb8500]/15" />
                        </div>

                        {/* Section Tools Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {section.tools.map((tool, tIdx) => {
                            const ToolIcon = tool.icon;
                            return (
                              <div
                                key={tIdx}
                                className="flex flex-col p-3 rounded-xl bg-white border border-[#fb8500]/20 shadow-sm hover:shadow-md hover:border-[#fb8500]/40 transition-all"
                              >
                                <div className="flex items-center justify-between mb-1.5">
                                  <div className="flex items-center gap-2 text-xs font-bold text-[#121212]">
                                    <ToolIcon size={16} className="text-[#fb8500]" />
                                    {tool.name}
                                  </div>
                                  <span className="px-2 py-0.5 rounded-full bg-[#fb8500]/10 text-[#fb8500] text-[9px] font-bold border border-[#fb8500]/20 whitespace-nowrap">
                                    {tool.badge}
                                  </span>
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
        </div>
      </main>
    </div>
  );
}