import type { Metadata } from "next";
import "./globals.css";
import Footer from "@/components/layout/Footer"; // <-- 1. Import Footer

export const metadata: Metadata = {
  title: "MeetTools - Next-Gen Image Processing",
  description: "Batch image scaling, presets, and cloud media utilities",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen flex flex-col justify-between">
        <div className="flex-1">
          {children}
        </div>
        
        {/* 2. Render Footer here */}
        <Footer />
      </body>
    </html>
  );
}