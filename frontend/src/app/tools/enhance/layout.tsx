import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Enhance Image Quality Online Free",
  description:
    "Free online image enhancer to improve photo quality in seconds. Fix dull, dark or soft images and download the result.",
  alternates: { canonical: "/tools/enhance" },
  openGraph: {
    title: "Enhance Image Quality Online Free | MeetTools",
    description:
      "Improve photo quality online with the free MeetTools Image Enhancer.",
    url: "https://www.meetools.online/tools/enhance",
  },
};

export default function EnhanceLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
