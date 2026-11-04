import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Free Online Image Tools",
  description:
    "Free online image tools: resize, compress and clean images in bulk.",
};

export default function ToolsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}