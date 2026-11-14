
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Image Resizer",
  description:
    "Resize images online for free with MeetTools. Adjust image dimensions, choose presets, and download resized photos quickly without losing quality.",
  alternates: {
    canonical: "/tools/resize",
  },
};

export default function ResizeLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}
