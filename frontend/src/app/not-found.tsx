import Link from "next/link";
import Navbar from "@/components/layout/Navbar";

export const metadata = {
  title: "Page Not Found",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-[#fff3ec] text-[#121212] font-sans">
      <Navbar />

      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24">
        <span className="inline-block px-3 py-1 rounded-full bg-[#fb8500]/10 border border-[#fb8500]/30 text-[#fb8500] text-[10px] font-bold uppercase tracking-widest mb-4">
          Error 404
        </span>

        <h1 className="text-4xl md:text-6xl font-black mb-4">
          Page <span className="text-[#fb8500]">Not Found</span>
        </h1>

        <p className="max-w-md text-sm md:text-base text-[#555555] mb-8 leading-relaxed">
          The page you are looking for does not exist or has been moved. Try
          our free image tools instead.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/tools/resize"
            className="px-6 py-3 rounded-2xl bg-[#fb8500] hover:bg-[#e07600] text-white font-bold shadow-lg shadow-[#fb8500]/30 transition-all"
          >
            Open Image Resizer
          </Link>

          <Link
            href="/"
            className="px-6 py-3 rounded-2xl border-2 border-[#fb8500]/40 hover:bg-[#fb8500]/10 font-bold transition-colors"
          >
            Go Home
          </Link>
        </div>
      </main>
    </div>
  );
}