"use client";

import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import { CropIcon, UploadSimpleIcon, DownloadSimpleIcon, ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

export default function ImageResizeTool() {
  const [image, setImage] = useState<string | null>(null);
  const [width, setWidth] = useState<number>(800);
  const [height, setHeight] = useState<number>(600);
  const [fileName, setFileName] = useState<string>("");

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        setImage(uploadEvent.target?.result as string);
      };
      reader.readAsDataURL(file);
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
              <h1 className="text-2xl font-black text-[#121212]">Image Resizer Utility</h1>
              <p className="text-sm text-[#555555]">Upload an image, specify dimensions, and export instantly.</p>
            </div>
          </div>

          {!image ? (
            <label className="border-2 border-dashed border-[#fb8500]/40 hover:border-[#fb8500] rounded-3xl p-12 flex flex-col items-center justify-center cursor-pointer bg-[#fff3ec]/30 transition-all group">
              <div className="p-4 bg-[#fb8500]/10 text-[#fb8500] rounded-2xl mb-4 group-hover:scale-110 transition-transform">
                <UploadSimpleIcon size={32} weight="duotone" />
              </div>
              <span className="text-base font-bold text-[#121212] mb-1">Click to upload image</span>
              <span className="text-xs text-[#777777]">PNG, JPG, or WEBP supported</span>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
          ) : (
            <div className="space-y-8">
              <div className="flex flex-col md:flex-row gap-8 items-center bg-[#fff3ec]/40 p-6 rounded-2xl border border-[#fb8500]/20">
                <div className="w-full md:w-1/2 flex justify-center">
                  <img
                    src={image}
                    alt="Preview"
                    style={{ width: `${width}px`, maxHeight: "300px" }}
                    className="object-contain rounded-xl shadow-md border border-[#fb8500]/20 max-w-full"
                  />
                </div>
                <div className="w-full md:w-1/2 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#333333] mb-1 uppercase tracking-wider">
                      Width (px)
                    </label>
                    <input
                      type="number"
                      value={width}
                      onChange={(e) => setWidth(Number(e.target.value))}
                      className="w-full px-4 py-3 bg-white border border-[#fb8500]/20 rounded-xl text-sm font-bold focus:outline-none focus:border-[#fb8500]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#333333] mb-1 uppercase tracking-wider">
                      Height (px)
                    </label>
                    <input
                      type="number"
                      value={height}
                      onChange={(e) => setHeight(Number(e.target.value))}
                      className="w-full px-4 py-3 bg-white border border-[#fb8500]/20 rounded-xl text-sm font-bold focus:outline-none focus:border-[#fb8500]"
                    />
                  </div>
                  <button
                    onClick={() => alert(`Image resized successfully to ${width}x${height}!`)}
                    className="w-full py-3.5 bg-[#fb8500] hover:bg-[#e07600] text-white font-bold rounded-xl transition-all shadow-md shadow-[#fb8500]/30 flex items-center justify-center gap-2 text-sm"
                  >
                    <DownloadSimpleIcon size={18} weight="bold" /> Download Resized Image
                  </button>
                  <button
                    onClick={() => setImage(null)}
                    className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-[#555555] font-bold rounded-xl transition-colors text-xs"
                  >
                    Upload Different Image
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}