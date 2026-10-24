"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import { ArrowArcRightIcon, SparkleIcon, ShieldIcon, CheckCircleIcon, CookieIcon } from "@phosphor-icons/react/dist/ssr";
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
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center max-w-5xl mx-auto">
        
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#fb8500]/10 border border-[#fb8500]/30 text-[#fb8500] text-xs font-bold mb-8 shadow-sm">
          <SparkleIcon size={16} weight="fill" className="text-[#fb8500]" />
          <span>Next-Gen Image Processing Platform</span>
        </div>

        {/* Main Heading */}
        <h1 className="text-5xl md:text-7xl font-black tracking-tight text-[#121212] mb-6 leading-tight">
          Manage & Transform Images with <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#fb8500] to-[#ffb703]">
            Elite Color Precision
          </span>
        </h1>

        {/* Subtitle */}
        <p className="max-w-2xl text-lg text-[#555555] mb-10 leading-relaxed font-medium">
          Experience lightning-fast batch scaling, automated preset management, and secure cloud workflows designed for modern professionals.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center max-w-md">
          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-2 h-14 px-8 rounded-2xl bg-[#fb8500] hover:bg-[#e07600] text-white font-bold transition-all shadow-xl shadow-[#fb8500]/30 text-base"
          >
            Explore Dashboard
            <ArrowArcRightIcon size={20} weight="bold" />
          </Link>
          <Link
            href="/presets"
            className="flex items-center justify-center h-14 px-8 rounded-2xl border-2 border-[#fb8500]/40 hover:bg-[#fb8500]/10 text-[#121212] font-bold transition-colors text-base"
          >
            View Presets
          </Link>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-24 text-left">
          
          <div className="p-8 rounded-3xl bg-white border border-[#fb8500]/20 shadow-lg shadow-[#fb8500]/5 backdrop-blur-sm">
            <div className="p-3.5 bg-[#fb8500]/10 text-[#fb8500] rounded-2xl w-fit mb-5 border border-[#fb8500]/20">
              <SparkleIcon size={28} weight="duotone" />
            </div>
            <h3 className="text-xl font-bold text-[#121212] mb-2">Instant Presets</h3>
            <p className="text-sm text-[#555555] leading-relaxed">
              Apply customized filters and dimensions instantly with one-click preset synchronization.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-white border border-[#fb8500]/20 shadow-lg shadow-[#fb8500]/5 backdrop-blur-sm">
            <div className="p-3.5 bg-[#fb8500]/10 text-[#fb8500] rounded-2xl w-fit mb-5 border border-[#fb8500]/20">
              <ShieldIcon size={28} weight="duotone" />
            </div>
            <h3 className="text-xl font-bold text-[#121212] mb-2">Secure Pipeline</h3>
            <p className="text-sm text-[#555555] leading-relaxed">
              Protected authentication routines and encrypted token handling for complete data safety.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-white border border-[#fb8500]/20 shadow-lg shadow-[#fb8500]/5 backdrop-blur-sm">
            <div className="p-3.5 bg-[#fb8500]/10 text-[#fb8500] rounded-2xl w-fit mb-5 border border-[#fb8500]/20">
              <CheckCircleIcon size={28} weight="duotone" />
            </div>
            <h3 className="text-xl font-bold text-[#121212] mb-2">High Efficiency</h3>
            <p className="text-sm text-[#555555] leading-relaxed">
              Optimized for high-performance rendering with zero latency and smooth UI transitions.
            </p>
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

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-[#777777] border-t border-[#fb8500]/20 bg-white">
        © {new Date().getFullYear()} MeetTools SaaS. All rights reserved.
      </footer>
    </div>
  );
}