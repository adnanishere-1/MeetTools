export const dynamic = "force-dynamic";
import ResizeFaq from "@/components/ResizeFaq";
import ResizeGuide from "@/components/Resizeguide";
import PresetLinks from "@/components/PresetLinks";
import { Suspense } from "react";
import ImageResizeTool from "@/components/tools/ImageResizeTool";

export default function ResizePage() {
  return (
    <Suspense fallback={null}>
      <ImageResizeTool />
      <ResizeGuide />
      <ResizeFaq />
      <PresetLinks />
    </Suspense>
  );
}