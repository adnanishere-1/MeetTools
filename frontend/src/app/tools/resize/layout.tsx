import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Image Resizer",
  description: "Resize images online to any size or preset, free.",
  alternates: { canonical: "/tools/resize" },
};

export default function ResizeLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}