import type { Metadata } from "next";
import "./globals.css";

import Footer from "@/components/layout/Footer";
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.meetools.online"),
  title: {
    default: "Free Online Image Tools & Utilities | MeetTools",
    template: "%s | MeetTools",
  },
  description:
    "Resize and enhance images online for free with MeetTools. Explore fast image processing tools, custom size presets, and easy downloads.",
  openGraph: {
    title: "MeetTools - Free Online Image Processing Tools",
    description:
      "Batch image scaling, presets, and cloud media utilities.",
    url: "https://www.meetools.online",
    siteName: "MeetTools",
    type: "website",
    images: [
      {
        url: "/images/og-image.png",
        width: 1200,
        height: 630,
        alt: "MeetTools - Free Online Image Tools",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MeetTools - Free Online Image Tools",
    description: "Resize, compress and convert images online for free.",
    images: ["/images/favicon.svg"],
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
    other: [
      {
        rel: "icon",
        url: "/images/web-app-manifest-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        rel: "icon",
        url: "/images/web-app-manifest-512x512.png",
        sizes: "512x512",
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "MeetTools",
              url: "https://www.meetools.online",
            }),
          }}
        />

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