"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import { ArrowRightIcon, UploadSimpleIcon, SlidersHorizontalIcon, DownloadSimpleIcon, CookieIcon, SquaresFourIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

export default function Home() {
  const [cookieConsent, setCookieConsent] = useState<string | null>(null);

  useEffect(() => {
    const consent = localStorage.getItem("meettools_cookie_consent");
    if (consent) {
      setCookieConsent(consent);
    }
  }, []);

  const handleAcceptCookies = () => {
    localStorage.setItem("meettools_cookie_consent", "accepted");
    setCookieConsent("accepted");
  };

  const handleRejectCookies = () => {
    localStorage.setItem("meettools_cookie_consent", "rejected");
    setCookieConsent("rejected");
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fff3ec] text-[#121212] font-sans relative">
      
      {/* Navbar Integration */}
      <Navbar />

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center max-w-5xl mx-auto">
        
        {/* Cool Multi-Tool Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#fb8500]/10 border border-[#fb8500]/30 text-[#fb8500] text-xs font-bold mb-6 shadow-sm">
          <SquaresFourIcon size={16} weight="fill" className="text-[#fb8500]" />
          <span>All-in-One Multi-Tools Suite for Creators</span>
        </div>

        {/* Main Heading for Multiple Tools */}
        <h1 className="text-5xl md:text-7xl font-black tracking-tight text-[#121212] mb-6 leading-tight">
          One Suite. Infinite Utilities. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#fb8500] to-[#e07600]">
            Supercharge Your Workflow
          </span>
        </h1>

        {/* Subtitle Covering All Tools */}
        <p className="max-w-2xl text-lg text-[#555555] mb-12 leading-relaxed font-medium">
          Zero bloat. Infinite utilities. Drop your files, hit export, and let the tools do the heavy lifting
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center max-w-md">
          <Link
            href="/tools"
            className="flex items-center justify-center gap-2 h-14 px-8 rounded-2xl bg-[#fb8500] hover:bg-[#e07600] text-white font-bold transition-all shadow-xl shadow-[#fb8500]/30 text-base"
          >
            Explore All Tools
            <ArrowRightIcon size={20} weight="bold" />
          </Link>
          <Link
            href="/signup"
            className="flex items-center justify-center h-14 px-8 rounded-2xl border-2 border-[#fb8500]/40 hover:bg-[#fb8500]/10 text-[#121212] font-bold transition-colors text-base"
          >
            Get Started Free
          </Link>
        </div>

        {/* Interactive Multi-Tool Workflow Section */}
        <div className="w-full mt-32 text-left">
          <div className="text-center max-w-xl mx-auto mb-14">
            <h2 className="text-3xl font-black text-[#121212] mb-3">How Our Suite Works</h2>
            <p className="text-sm text-[#555555]">Access any utility, process your files, and export in seconds.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Step 1 */}
            <div className="bg-white p-8 rounded-3xl border border-[#fb8500]/20 shadow-xl shadow-[#fb8500]/5 relative flex flex-col justify-between group hover:border-[#fb8500] transition-all">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="p-4 bg-[#fb8500]/10 text-[#fb8500] rounded-2xl border border-[#fb8500]/20 group-hover:scale-110 transition-transform">
                    <UploadSimpleIcon size={28} weight="duotone" />
                  </div>
                  <span className="text-3xl font-black text-[#fb8500]/20">01</span>
                </div>
                <h3 className="text-lg font-bold text-[#121212] mb-2">Choose & Upload</h3>
                <p className="text-xs text-[#555555] leading-relaxed">
                  Select your desired utility from our toolkit and drop your files securely into the browser workspace.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-white p-8 rounded-3xl border border-[#fb8500]/20 shadow-xl shadow-[#fb8500]/5 relative flex flex-col justify-between group hover:border-[#fb8500] transition-all">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="p-4 bg-[#fb8500]/10 text-[#fb8500] rounded-2xl border border-[#fb8500]/20 group-hover:scale-110 transition-transform">
                    <SlidersHorizontalIcon size={28} weight="duotone" />
                  </div>
                  <span className="text-3xl font-black text-[#fb8500]/20">02</span>
                </div>
                <h3 className="text-lg font-bold text-[#121212] mb-2">Configure Settings</h3>
                <p className="text-xs text-[#555555] leading-relaxed">
                  Apply custom dimensions, scaling rules, or format parameters with real-time live preview rendering.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-white p-8 rounded-3xl border border-[#fb8500]/20 shadow-xl shadow-[#fb8500]/5 relative flex flex-col justify-between group hover:border-[#fb8500] transition-all">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="p-4 bg-[#fb8500]/10 text-[#fb8500] rounded-2xl border border-[#fb8500]/20 group-hover:scale-110 transition-transform">
                    <DownloadSimpleIcon size={28} weight="duotone" />
                  </div>
                  <span className="text-3xl font-black text-[#fb8500]/20">03</span>
                </div>
                <h3 className="text-lg font-bold text-[#121212] mb-2">Instant Download</h3>
                <p className="text-xs text-[#555555] leading-relaxed">
                  Export your optimized, high-quality assets instantly with zero hassle and absolute data privacy.
                </p>
              </div>
            </div>

          </div>
        </div>

      </main>

      {/* Cookie Consent Banner */}
      {!cookieConsent && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6 bg-[#121212]/95 backdrop-blur-md border-t-4 border-[#fb8500] text-white shadow-2xl animate-slide-up">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-left">
              <div className="p-3 bg-[#fb8500] rounded-xl text-white hidden sm:block">
                <CookieIcon size={28} weight="fill" />
              </div>
              <p className="text-sm text-[#fff3ec]/90 leading-relaxed">
                We use cookies to enhance your user experience, analyze traffic, and ensure secure authentication. By clicking <strong className="text-white">Accept</strong>, you consent to our data collection policies.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={handleRejectCookies}
                className="px-5 py-2.5 rounded-xl border border-white/20 text-white text-sm font-bold hover:bg-white/10 transition-colors"
              >
                Reject
              </button>
              <button
                onClick={handleAcceptCookies}
                className="px-6 py-2.5 rounded-xl bg-[#fb8500] hover:bg-[#e07600] text-white text-sm font-bold transition-all shadow-md shadow-[#fb8500]/30"
              >
                Accept All
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}