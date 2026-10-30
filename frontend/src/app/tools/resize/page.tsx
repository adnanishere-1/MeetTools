import { Suspense } from "react";
import ImageResizeTool from "@/components/tools/ImageResizeTool";

export default function ResizePage() {
  return (
    <Suspense fallback={null}>
      <ImageResizeTool />
    </Suspense>
  );
}