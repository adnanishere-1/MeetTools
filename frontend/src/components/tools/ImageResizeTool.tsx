"use client";

import React, { useState, useEffect, useRef } from 'react';
import Navbar from "@/components/layout/Navbar";
import { CropIcon, UploadSimpleIcon, ArrowLeftIcon, SlidersHorizontalIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { useImageResize } from '@/hooks/useImageResize';

export default function ImageResizeTool() {
  const [file, setFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [width, setWidth] = useState<string>('800');
  const [height, setHeight] = useState<string>('600');
  const [format, setFormat] = useState<'jpeg' | 'png' | 'webp' | 'avif'>('webp');
  const [quality, setQuality] = useState<string>('90'); // Default high quality for clean output
  const [isDownloading, setIsDownloading] = useState(false);

  const { handleResize, loading, status, progressMessage, result, error } = useImageResize();
  const resultRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on completion
  useEffect(() => {
    if (result && result.status === 'completed') {
      resultRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [result]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (uploadedFile) {
      setFile(uploadedFile);
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        setPreviewImage(uploadEvent.target?.result as string);
      };
      reader.readAsDataURL(uploadedFile);
    }
  };

  const handleExecuteResize = () => {
    if (!file) {
      alert("Please upload an image first!");
      return;
    }

    const numericQuality = Math.min(Math.max(Number(quality) || 90, 10), 100);

    console.log("🔥 Triggering resize for file:", file.name);

    handleResize(file, {
      width: width ? Number(width) : undefined,
      height: height ? Number(height) : undefined,
      format,
      quality: numericQuality,
    });
  };

  // 📥 Direct Local Library / Folder Download Function (Blob method)
  const handleDownloadImage = async (url: string, filename: string) => {
    try {
      setIsDownloading(true);
      const response = await fetch(url);
      const blob = await response.blob();
      
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename || `resized-image.${format}`;
      document.body.appendChild(link);
      link.click();
      
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Direct download failed, opening in new tab:", err);
      window.open(url, '_blank');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fff3ec] text-[#121212] font-sans">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto px-6 py-12 w-full">
        <Link
          href="/tools"
          className="inline-flex items-center gap-2 text-sm font-bold text-[#555555] hover:text-[#fb8500] transition-colors mb-8"
        >
          <ArrowLeftIcon size={18} /> Back to Tools
        </Link>

        <div className="bg-white rounded-3xl p-8 border border-[#fb8500]/20 shadow-xl shadow-[#fb8500]/5">
          <div className="flex items-center gap-4 mb-8 pb-6 border-b border-[#fb8500]/10">
            <div className="p-3 bg-[#fb8500]/10 text-[#fb8500] rounded-2xl border border-[#fb8500]/20">
              <CropIcon size={28} weight="duotone" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-[#121212]">Image Resize & Compress Utility</h1>
              <p className="text-sm text-[#555555]">Powered by backend background worker queue & ImageKit.</p>
            </div>
          </div>

          {!file ? (
            <label className="border-2 border-dashed border-[#fb8500]/40 hover:border-[#fb8500] rounded-3xl p-12 flex flex-col items-center justify-center cursor-pointer bg-[#fff3ec]/30 transition-all group">
              <div className="p-4 bg-[#fb8500]/10 text-[#fb8500] rounded-2xl mb-4 group-hover:scale-110 transition-transform">
                <UploadSimpleIcon size={32} weight="duotone" />
              </div>
              <span className="text-base font-bold text-[#121212] mb-1">Click to upload image</span>
              <span className="text-xs text-[#777777]">PNG, JPG, WEBP, or AVIF supported</span>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
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

                {/* Settings Form Controls */}
                <div className="w-full md:w-1/2 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#333333] mb-1 uppercase tracking-wider">
                        Width (px)
                      </label>
                      <input
                        type="number"
                        value={width}
                        onChange={(e) => setWidth(e.target.value)}
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
                        value={height}
                        onChange={(e) => setHeight(e.target.value)}
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
                        onChange={(e) => setFormat(e.target.value as any)}
                        className="w-full px-4 py-2.5 bg-white border border-[#fb8500]/20 rounded-xl text-sm font-bold focus:outline-none focus:border-[#fb8500]"
                      >
                        <option value="webp">WebP</option>
                        <option value="jpeg">JPEG</option>
                        <option value="png">PNG</option>
                        <option value="avif">AVIF</option>
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
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (val > 100) setQuality('100');
                          else setQuality(e.target.value);
                        }}
                        className="w-full px-4 py-2.5 bg-white border border-[#fb8500]/20 rounded-xl text-sm font-bold focus:outline-none focus:border-[#fb8500]"
                      />
                    </div>
                  </div>

                  {/* Direct Action Button */}
                  <button
                    type="button"
                    onClick={handleExecuteResize}
                    disabled={loading}
                    className="w-full py-3.5 bg-[#fb8500] hover:bg-[#e07600] text-white font-bold rounded-xl transition-all shadow-lg shadow-[#fb8500]/30 flex items-center justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
                  >
                    <SlidersHorizontalIcon size={18} weight="bold" />
                    {loading ? 'Processing Background Job...' : 'Resize & Compress Image'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      setPreviewImage(null);
                    }}
                    className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-[#555555] font-bold rounded-xl transition-colors text-xs cursor-pointer"
                  >
                    Upload Different Image
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Progress / Status Section */}
          {loading && (
            <div className="mt-6 p-6 bg-orange-50 border border-orange-200 rounded-2xl text-center space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#fb8500] mx-auto"></div>
              <p className="text-sm font-bold text-orange-800">{progressMessage || 'Processing image in background queue...'}</p>
              <span className="text-xs text-gray-500 uppercase tracking-widest font-extrabold">Status: {status || 'processing'}</span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm font-semibold text-center">
              {error}
            </div>
          )}

          {/* Result Section with Ref for Auto-Scroll */}
          <div ref={resultRef}>
            {result && result.status === 'completed' && (
              <div className="mt-6 p-6 bg-green-50 border border-green-200 rounded-2xl space-y-4 text-center">
                <h3 className="text-base font-black text-green-800">✅ Image Processed Successfully via Queue!</h3>
                <div className="flex justify-center my-2">
                  <img src={result.previewUrl} alt="Resized Result" className="max-h-52 rounded-xl shadow-md border border-green-200" />
                </div>
                <button
                  type="button"
                  disabled={isDownloading}
                  onClick={() => handleDownloadImage(result.downloadUrl, result.fileDetails?.fileName || `compressed-image.${format}`)}
                  className="block text-center w-full py-3.5 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-green-600/30 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isDownloading ? 'Downloading to Library...' : 'Download Processed Image'}
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}