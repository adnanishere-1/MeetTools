"use client";

import React from "react";
import Navbar from "@/components/layout/Navbar";
import Link from "next/link";
import {
  FileTextIcon,
  FilePdfIcon,
  FileArchiveIcon,
  ImagesIcon,
  CropIcon as CropToolIcon,
  PaintBrushIcon,
  ArrowsClockwiseIcon,
  FileMinusIcon,
  FilePlusIcon,
  MagicWandIcon,
  ShieldCheckIcon,
  LightningIcon,
  SparkleIcon,
  ArrowRightIcon,
} from "@phosphor-icons/react/dist/ssr";

const toolsSections = [
  {
    sectionTitle: "Image Tools",
    sectionIcon: ImagesIcon,
    tools: [
      {
        name: "Image Resize",
        description: "Resize dimensions, convert formats, and compress images instantly.",
        icon: CropToolIcon,
        badge: "Available Now",
        href: "/tools/resize",
        isLive: true,
      },
      {
        name: "Image Enhancer",
        description: "Upscale and enhance image quality with advanced background processing.",
        icon: MagicWandIcon,
        badge: "Available Now",
        href: "/tools/enhance",
        isLive: true,
      },
      {
        name: "Image Compressor",
        description: "Reduce image file size up to 90% without losing visual quality.",
        icon: LightningIcon,
        badge: "Coming Soon",
        href: "#",
        isLive: false,
      },
      {
        name: "Background Remover",
        description: "Remove image backgrounds automatically in seconds.",
        icon: PaintBrushIcon,
        badge: "Coming Soon",
        href: "#",
        isLive: false,
      },
    ],
  },
  {
    sectionTitle: "PDF Tools",
    sectionIcon: FilePdfIcon,
    tools: [
      {
        name: "PDF Converter",
        description: "Convert images & documents to clean PDFs instantly.",
        icon: FileTextIcon,
        badge: "Coming Soon",
        href: "#",
        isLive: false,
      },
      {
        name: "PDF Merge",
        description: "Combine multiple PDF files into one single document.",
        icon: FilePlusIcon,
        badge: "Coming Soon",
        href: "#",
        isLive: false,
      },
      {
        name: "PDF Split",
        description: "Extract specific pages or split a PDF by page ranges.",
        icon: FileMinusIcon,
        badge: "Coming Soon",
        href: "#",
        isLive: false,
      },
      {
        name: "PDF Compress",
        description: "Shrink large PDF file sizes without losing readability.",
        icon: FileArchiveIcon,
        badge: "Coming Soon",
        href: "#",
        isLive: false,
      },
    ],
  },
  {
    sectionTitle: "Compression & Archive",
    sectionIcon: FileArchiveIcon,
    tools: [
      {
        name: "Bulk ZIP Compressor",
        description: "Compress multiple media files into a single ZIP archive.",
        icon: FileArchiveIcon,
        badge: "Coming Soon",
        href: "#",
        isLive: false,
      },
      {
        name: "Batch Format Converter",
        description: "Convert dozens of files from one format to another at once.",
        icon: ArrowsClockwiseIcon,
        badge: "Coming Soon",
        href: "#",
        isLive: false,
      },
      {
        name: "Document Optimizer",
        description: "Optimize heavy documents for web upload & email sharing.",
        icon: ShieldCheckIcon,
        badge: "Coming Soon",
        href: "#",
        isLive: false,
      },
      {
        name: "Video Compressor",
        description: "Lightweight video compression online with custom settings.",
        icon: SparkleIcon,
        badge: "Coming Soon",
        href: "#",
        isLive: false,
      },
    ],
  },
];

export default function ToolsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#fff3ec] text-[#121212] font-sans">
      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto px-6 py-12 w-full space-y-12">
        {/* Header Section */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl md:text-4xl font-black text-[#121212] tracking-tight">
            Explore All <span className="text-[#fb8500]">MeetTools</span> Utilities
          </h1>
          <p className="text-sm md:text-base text-[#555555] max-w-2xl mx-auto">
            All-in-one platform powered by high-performance background workers and secure datastore processing. Choose a tool below to get started.
          </p>
        </div>

        {/* Tools Sections Loop */}
        {toolsSections.map((section) => {
          const SectionIcon = section.sectionIcon;

          return (
            <div key={section.sectionTitle} className="space-y-4">
              <div className="flex items-center gap-2.5 border-b border-[#fb8500]/20 pb-3">
                <div className="p-2 bg-[#fb8500]/10 text-[#fb8500] rounded-xl">
                  <SectionIcon size={22} weight="duotone" />
                </div>
                <h2 className="text-lg font-black text-[#121212] uppercase tracking-wide">
                  {section.sectionTitle}
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {section.tools.map((tool) => {
                  const ToolIcon = tool.icon;

                  return (
                    <Link
                      key={tool.name}
                      href={tool.href}
                      className={`p-6 bg-white rounded-3xl border transition-all duration-300 transform hover:-translate-y-1.5 flex flex-col justify-between group relative overflow-hidden shadow-sm ${
                        tool.isLive
                          ? "border-[#fb8500]/40 hover:border-[#fb8500] hover:shadow-xl hover:shadow-[#fb8500]/15 cursor-pointer"
                          : "border-[#fb8500]/15 hover:border-[#fb8500]/40 hover:shadow-lg hover:shadow-[#fb8500]/10 opacity-90"
                      }`}
                    >
                      {/* Left Accent Glow Line Animation */}
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-[#fb8500] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="p-3 bg-[#fb8500]/10 text-[#fb8500] rounded-2xl group-hover:bg-[#fb8500] group-hover:text-white group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-sm">
                            <ToolIcon size={24} weight="duotone" />
                          </div>
                          <span
                            className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider transition-colors ${
                              tool.isLive
                                ? "bg-green-100 text-green-700 border border-green-200 group-hover:bg-green-200"
                                : "bg-[#fb8500]/10 text-[#fb8500] group-hover:bg-[#fb8500]/20"
                            }`}
                          >
                            {tool.badge}
                          </span>
                        </div>

                        <div className="space-y-1.5">
                          <h3 className="text-base font-black text-[#121212] group-hover:text-[#fb8500] transition-colors flex items-center justify-between">
                            {tool.name}
                          </h3>
                          <p className="text-xs text-[#666666] group-hover:text-[#333333] transition-colors leading-relaxed">
                            {tool.description}
                          </p>
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-[#fb8500]/10 flex items-center justify-between text-xs font-bold text-[#fb8500]">
                        <span className="group-hover:translate-x-0.5 transition-transform">
                          {tool.isLive ? "Launch Tool" : "In Development"}
                        </span>
                        <ArrowRightIcon size={16} className="transform group-hover:translate-x-1.5 transition-all duration-300" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </main>
    </div>
  );
}