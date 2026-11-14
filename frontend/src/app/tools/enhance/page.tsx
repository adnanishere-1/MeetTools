
import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Link from "next/link";
import {
  ArrowLeftIcon,
  MagicWandIcon,
} from "@phosphor-icons/react/dist/ssr";

import ImageEnhancerTool from "@/components/tools/image-enhancer/ImageEnhancerTool";
import EnhanceContent from "@/components/EnhanceContent";
import PresetLinks from "@/components/PresetLinks";

export const metadata: Metadata = {
  title: "Free Online Image Enhancer",
  description:
    "Enhance image quality online for free with MeetTools. Improve your photos, adjust enhancement settings, and download enhanced images in a few simple steps.",
  alternates: {
    canonical: "/tools/enhance",
  },
  openGraph: {
    title: "Free Online Image Enhancer | MeetTools",
    description:
      "Improve image quality online with the free MeetTools Image Enhancer. Adjust settings and download your enhanced photos.",
    url: "https://www.meetools.online/tools/enhance",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function EnhancePage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#fff3ec] text-[#121212] font-sans">
      <Navbar />

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <Link
          href="/tools"
          className="inline-flex items-center gap-2 mb-8 text-sm font-bold text-[#555555] hover:text-[#fb8500] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fb8500] focus-visible:ring-offset-2 rounded-md"
        >
          <ArrowLeftIcon size={18} aria-hidden="true" />
          Back to Tools
        </Link>

        <section
          aria-labelledby="image-enhancer-heading"
          className="bg-white rounded-3xl p-5 sm:p-8 border border-[#fb8500]/20 shadow-xl shadow-[#fb8500]/5 space-y-8"
        >
          <div className="flex items-center gap-4 mb-4 pb-6 border-b border-[#fb8500]/10">
            <div className="p-3 bg-[#fff3ec] text-[#fb8500] rounded-2xl border border-[#fb8500]/30 shadow-sm">
              <MagicWandIcon
                size={28}
                weight="duotone"
                aria-hidden="true"
              />
            </div>

            <div>
              <h1
                id="image-enhancer-heading"
                className="text-2xl font-black text-[#121212]"
              >
                Free Online Image Enhancer
              </h1>

              <p className="text-sm text-[#555555]">
                Enhance image quality online. Adjust the settings and customize
                the background to improve your images.
              </p>
            </div>
          </div>

          <ImageEnhancerTool />
        </section>
      </main>

      <EnhanceContent />
      <PresetLinks currentHref="/tools/enhance" />
    </div>
  );
}
