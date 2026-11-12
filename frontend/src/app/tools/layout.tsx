
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Free Online Image Resizer | MeetTools",
  description:
    "Resize images online to custom dimensions or preset sizes. Use MeetTools to quickly resize your images for free.",
};

export default function ResizeLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}
