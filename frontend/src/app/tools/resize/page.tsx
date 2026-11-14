
import type { Metadata } from "next";
import ResizeFaq from "@/components/ResizeFaq";
import ResizeGuide from "@/components/Resizeguide";
import PresetLinks from "@/components/PresetLinks";
import ImageResizeTool from "@/components/tools/ImageResizeTool";

export const metadata: Metadata = {
  title: "Free Online Image Resizer",
  description:
    "Resize images online for free with custom dimensions. Adjust image width, height, and quality to create images for websites, social media, and everyday use.",
  alternates: {
    canonical: "/tools/resize",
  },
  openGraph: {
    title: "Free Online Image Resizer | MeetTools",
    description:
      "Resize images online for free. Set custom dimensions and adjust image quality with MeetTools.",
    url: "https://www.meetools.online/tools/resize",
    type: "website",
  },
};

export default function ResizePage() {
  return (
    <>
      <ImageResizeTool />
      <ResizeGuide />
      <ResizeFaq />
      <PresetLinks currentHref="/tools/resize" />
    </>
  );
}
