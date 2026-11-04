import type { Metadata } from "next";
import "./globals.css";

import Footer from "@/components/layout/Footer";
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.meetools.online"),
  title: {
    default: "MeetTools - Free Online Image Resize & Processing Tools",
    template: "%s | MeetTools",
  },
  description:
    "Resize, compress and clean images in bulk with free online tools. Batch image scaling, presets, and cloud media utilities.",
  openGraph: {
    title: "MeetTools - Free Online Image Processing Tools",
    description:
      "Batch image scaling, presets, and cloud media utilities.",
    url: "https://www.meetools.online",
    siteName: "MeetTools",
    type: "website",
  },
  icons: {
    icon: [
      {
        url: "/images/favicon-96x96.png",
        sizes: "96x96",
        type: "image/png",
      },
      {
        url: "/images/favicon.svg",
        type: "image/svg+xml",
      },
    ],
    shortcut: "/images/favicon.ico",
    apple: [
      {
        url: "/images/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  manifest: "/images/site.webmanifest",
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