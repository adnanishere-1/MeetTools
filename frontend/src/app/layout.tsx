
import type { Metadata } from "next";
import "./globals.css";

import Footer from "@/components/layout/Footer";
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "MeetTools - Next-Gen Image Processing",
  description:
    "Batch image scaling, presets, and cloud media utilities",
  icons: {
    icon: [
      {
        url: "/favicon.ico",
        sizes: "16x16 32x32",
        type: "image/x-icon",
      },
      {
        url: "/favicon.png",
        type: "image/png",
      },
    ],
    shortcut: "/favicon.ico",
    apple: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen flex flex-col justify-between bg-[#fff3ec] text-[#121212] font-sans">
        <AuthProvider>
          <div className="flex-1">{children}</div>
          <Footer />
        </AuthProvider>

        <Toaster
          position="top-right"
          richColors
          closeButton
          duration={4000}
          visibleToasts={3}
        />
      </body>
    </html>
  );
}
