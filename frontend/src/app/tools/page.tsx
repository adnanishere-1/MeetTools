
"use client";

import {
  useState,
  useEffect,
  type MouseEvent,
  type ReactNode,
} from "react";

import Link from "next/link";
import Navbar from "@/components/layout/Navbar";

import {
  FileArrowUpIcon,
  CropIcon,
  ImageSquareIcon,
  FileTextIcon,
  SlidersHorizontalIcon,
  SparkleIcon,
  XIcon,
} from "@phosphor-icons/react/dist/ssr";

// Tool information type
interface ToolItem {
  id: string;
  title: string;
  description: string;
  icon: ReactNode;
  available: boolean;
  link?: string;
}

// Available and upcoming tools
const toolsList: ToolItem[] = [
  {
    id: "image-resizer",
    title: "Image Resizer",
    description:
      "Instantly resize, scale, and compress images with high precision color preservation. Automatically saves to your Dashboard library.",
    icon: (
      <CropIcon
        size={32}
        weight="duotone"
        className="text-[#fb8500]"
      />
    ),
    available: true,
    link: "/tools/resize",
  },
  {
    id: "background-remover",
    title: "Background Remover",
    description:
      "Automatically remove image backgrounds with AI-powered edge detection.",
    icon: (
      <SparkleIcon
        size={32}
        weight="duotone"
        className="text-[#fb8500]"
      />
    ),
    available: false,
  },
  {
    id: "batch-converter",
    title: "Batch Converter",
    description:
      "Convert multiple PNG, JPG, and WebP images to different formats simultaneously.",
    icon: (
      <FileArrowUpIcon
        size={32}
        weight="duotone"
        className="text-[#fb8500]"
      />
    ),
    available: false,
  },
  {
    id: "color-enhancer",
    title: "Color Enhancer",
    description:
      "Optimize contrast, brightness, and color temperature profiles automatically.",
    icon: (
      <SlidersHorizontalIcon
        size={32}
        weight="duotone"
        className="text-[#fb8500]"
      />
    ),
    available: false,
  },
  {
    id: "pdf-compressor",
    title: "PDF Compressor",
    description:
      "Reduce PDF document size without losing document clarity and readability.",
    icon: (
      <FileTextIcon
        size={32}
        weight="duotone"
        className="text-[#fb8500]"
      />
    ),
    available: false,
  },
];

export default function ToolsPage() {
  const [modalMessage, setModalMessage] =
    useState<string | null>(null);

  // Close modal with Escape key
  // and prevent background scrolling
  useEffect(() => {
    if (!modalMessage) return;

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    const handleEscape = (
      event: KeyboardEvent
    ) => {
      if (event.key === "Escape") {
        setModalMessage(null);
      }
    };

    window.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [modalMessage]);

  // Handle upcoming tools
  const handleToolClick = (
    tool: ToolItem,
    event: MouseEvent<HTMLAnchorElement>
  ) => {
    if (!tool.available) {
      event.preventDefault();

      setModalMessage(
        `${tool.title} is currently on the way! We are building it for you.`
      );
    }
  };

  // Close popup
  const closeModal = () => {
    setModalMessage(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fff3ec] text-[#121212] font-sans relative">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-6 py-16 w-full">
        {/* Page Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#fb8500]/10 border border-[#fb8500]/30 text-[#fb8500] text-xs font-bold mb-4 shadow-sm">
            <ImageSquareIcon
              size={16}
              weight="fill"
            />

            <span>Powerful Suite</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-black text-[#121212] mb-4">
            MeetTools Utilities
          </h1>

          <p className="text-base text-[#555555]">
            Select from our professional suite of
            media processing tools. Processed
            outputs automatically sync with your
            dashboard library.
          </p>
        </div>

        {/* Tools Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {toolsList.map((tool) => (
            <Link
              key={tool.id}
              href={tool.link || "#"}
              onClick={(event) =>
                handleToolClick(tool, event)
              }
              className="group p-8 rounded-3xl bg-white border border-[#fb8500]/20 shadow-lg shadow-[#fb8500]/5 hover:shadow-xl hover:border-[#fb8500] transition-all flex flex-col justify-between relative overflow-hidden"
            >
              <div>
                {/* Icon and Availability */}
                <div className="flex items-center justify-between mb-6">
                  <div className="p-4 bg-[#fb8500]/10 rounded-2xl border border-[#fb8500]/20 group-hover:scale-110 transition-transform">
                    {tool.icon}
                  </div>

                  {!tool.available ? (
                    <span className="px-3 py-1 rounded-full bg-[#fb8500]/10 text-[#fb8500] text-xs font-bold border border-[#fb8500]/20">
                      On the Way 🚀
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-bold border border-emerald-200">
                      Available ✨
                    </span>
                  )}
                </div>

                {/* Tool Information */}
                <h3 className="text-xl font-bold text-[#121212] mb-2 group-hover:text-[#fb8500] transition-colors">
                  {tool.title}
                </h3>

                <p className="text-sm text-[#555555] leading-relaxed mb-6">
                  {tool.description}
                </p>
              </div>

              {/* Launch Label */}
              <div className="text-sm font-bold text-[#fb8500] flex items-center gap-1 pt-4 border-t border-[#fb8500]/10">
                {tool.available
                  ? "Launch Tool →"
                  : "Coming Soon..."}
              </div>
            </Link>
          ))}
        </div>
      </main>

      {/* Upcoming Tool Modal */}
      {modalMessage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeModal();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="tool-modal-title"
            aria-describedby="tool-modal-description"
            className="bg-white rounded-3xl p-8 max-w-sm w-full text-center border border-[#fb8500]/30 shadow-2xl relative"
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={closeModal}
              aria-label="Close popup"
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-[#fb8500] transition-colors"
            >
              <XIcon size={20} />
            </button>

            {/* Modal Icon */}
            <div className="w-16 h-16 bg-[#fb8500]/10 text-[#fb8500] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#fb8500]/20">
              <SparkleIcon
                size={32}
                weight="fill"
              />
            </div>

            {/* Modal Heading */}
            <h3
              id="tool-modal-title"
              className="text-xl font-black text-[#121212] mb-2"
            >
              Feature On The Way!
            </h3>

            {/* Modal Message */}
            <p
              id="tool-modal-description"
              className="text-sm text-[#555555] mb-6 leading-relaxed"
            >
              {modalMessage}
            </p>

            {/* Confirm Button */}
            <button
              type="button"
              onClick={closeModal}
              className="w-full py-3 bg-[#fb8500] hover:bg-[#e07600] text-white font-bold rounded-xl transition-all shadow-md shadow-[#fb8500]/30 text-sm"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
