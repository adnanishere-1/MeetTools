"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import {
  ArrowRightIcon, UploadSimpleIcon, SlidersHorizontalIcon, DownloadSimpleIcon,
  CookieIcon, SquaresFourIcon, LockIcon, LightningIcon, ClockIcon,
  FolderIcon, CheckCircleIcon, XCircleIcon, CrownIcon,
  SparkleIcon, FilePdfIcon, ImagesIcon, FileArchiveIcon, ShieldCheckIcon,
  RocketIcon, RepeatIcon, UserIcon
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import axios from "axios";

export default function Home() {
  const [cookieConsent, setCookieConsent] = useState<string | null>("loading");

  useEffect(() => {
    const checkConsentAndUser = async () => {
      const token = localStorage.getItem("token") || localStorage.getItem("meettools_token");

      if (token) {
        try {
          const response = await axios.get("/api/v1/users/me", {
            headers: { Authorization: `Bearer ${token}` },
          });

          const userData = response.data?.user;
          if (userData && userData.consents?.consentGivenAt) {
            const status = userData.consents.termsAndPrivacyAccepted ? "accepted" : "rejected";
            setCookieConsent(status);
            localStorage.setItem("meettools_cookie_consent", status);
            return;
          }
        } catch (error) {
          console.error("Failed to fetch user profile cookie status:", error);
        }
      }

      const localConsent = localStorage.getItem("meettools_cookie_consent");
      setCookieConsent(localConsent || "pending");
    };

    checkConsentAndUser();
  }, []);

  const handleConsentAction = async (consentStatus: "accepted" | "rejected") => {
    setCookieConsent(consentStatus);
    localStorage.setItem("meettools_cookie_consent", consentStatus);

    const token = localStorage.getItem("token") || localStorage.getItem("meettools_token");
    if (token) {
      try {
        await axios.put(
          "/api/v1/users/cookie-consent",
          { consent: consentStatus },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch (error) {
        console.error("Failed to save cookie consent to database:", error);
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fff3ec] text-[#121212] font-sans relative">

      <Navbar />

      {/* ══════════════════════════════ HERO ══════════════════════════════ */}
      <main className="flex-1 flex flex-col items-center px-6 pt-20 pb-24 text-center max-w-5xl mx-auto w-full">

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#fb8500]/10 border border-[#fb8500]/30 text-[#fb8500] text-xs font-bold mb-6 shadow-sm animate-fade-in">
          <SquaresFourIcon size={16} weight="fill" className="text-[#fb8500]" />
          <span>All-in-One Multi-Tools Suite for Creators</span>
        </div>

        {/* Heading */}
        <h1 className="text-5xl md:text-7xl font-black tracking-tight text-[#121212] mb-6 leading-tight">
          One Suite. Infinite Utilities. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#fb8500] to-[#e07600]">
            Supercharge Your Workflow
          </span>
        </h1>

        <p className="max-w-2xl text-lg text-[#555555] mb-8 leading-relaxed font-medium">
          Zero bloat. Infinite utilities. Drop your files, hit export, and let the tools do the heavy lifting.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center max-w-2xl mb-3">
          <Link
            href="/tools"
            className="flex items-center justify-center gap-2 h-14 px-8 rounded-2xl bg-[#fb8500] hover:bg-[#e07600] text-white font-bold transition-all shadow-xl shadow-[#fb8500]/30 text-base"
          >
            <RocketIcon size={20} weight="bold" />
            Try Instantly — No Signup Needed
          </Link>
          <Link
            href="/signup"
            className="flex items-center justify-center gap-2 h-14 px-8 rounded-2xl border-2 border-[#fb8500]/40 hover:bg-[#fb8500]/10 text-[#121212] font-bold transition-colors text-base"
          >
            <CrownIcon size={20} weight="bold" className="text-[#fb8500]" />
            Create Free Account
          </Link>
        </div>

        {/* Trust microcopy */}
        <p className="text-xs text-[#555555] mb-24 flex items-center justify-center gap-1.5 flex-wrap">
          <CheckCircleIcon size={14} weight="fill" className="text-[#fb8500]" />
          Free forever plan &nbsp;·&nbsp;
          <ShieldCheckIcon size={14} weight="fill" className="text-[#fb8500]" />
          Files auto-deleted in 24h &nbsp;·&nbsp;
          <LightningIcon size={14} weight="fill" className="text-[#fb8500]" />
          No credit card required
        </p>

        {/* ══════════════════════════════════════════════════════════════════
            ⭐ WHY LOGIN? — Single section (Clean professional English)
        ══════════════════════════════════════════════════════════════════ */}
        <div className="w-full max-w-5xl mb-32 text-left">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="inline-block px-3 py-1 rounded-full bg-[#fb8500]/10 border border-[#fb8500]/30 text-[#fb8500] text-[10px] font-bold uppercase tracking-widest mb-3">
              Why Create an Account?
            </span>
            <h2 className="text-3xl md:text-5xl font-black text-[#121212] mb-4 leading-tight">
              Upload Once. <span className="text-[#fb8500]">Reuse Forever.</span>
            </h2>
            <p className="text-sm md:text-base text-[#555555] leading-relaxed">
              With an account, your files stay securely in your personal workspace — resize the same asset today,
              convert formats tomorrow, or compress next week. <strong className="text-[#121212]">Never upload the same file twice.</strong>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Benefit 1 — Reuse */}
            <div className="bg-white p-8 rounded-3xl border-2 border-[#fb8500]/20 shadow-xl shadow-[#fb8500]/5 hover:border-[#fb8500] transition-all group">
              <div className="p-4 bg-[#fb8500]/10 text-[#fb8500] rounded-2xl border border-[#fb8500]/20 w-fit mb-6 group-hover:scale-110 transition-transform">
                <RepeatIcon size={28} weight="duotone" />
              </div>
              <h3 className="text-lg font-bold text-[#121212] mb-2">Reuse Files Across All Tools</h3>
              <p className="text-xs text-[#555555] leading-relaxed mb-4">
                Upload your asset once and utilize it across multiple utilities — resize today, convert to WebP tomorrow, or compress anytime without re-uploading.
              </p>
              <div className="flex items-center gap-2 text-[10px] font-bold text-[#fb8500] uppercase tracking-wider">
                <CheckCircleIcon size={14} weight="fill" />
                Members Only
              </div>
            </div>

            {/* Benefit 2 — Data saved */}
            <div className="bg-white p-8 rounded-3xl border-2 border-[#fb8500]/20 shadow-xl shadow-[#fb8500]/5 hover:border-[#fb8500] transition-all group">
              <div className="p-4 bg-[#fb8500]/10 text-[#fb8500] rounded-2xl border border-[#fb8500]/20 w-fit mb-6 group-hover:scale-110 transition-transform">
                <FolderIcon size={28} weight="duotone" />
              </div>
              <h3 className="text-lg font-bold text-[#121212] mb-2">Persistent Cloud History</h3>
              <p className="text-xs text-[#555555] leading-relaxed mb-4">
                Every processed result is securely stored in your dashboard for 24 hours. Access your export history and re-download anytime without data loss.
              </p>
              <div className="flex items-center gap-2 text-[10px] font-bold text-[#fb8500] uppercase tracking-wider">
                <CheckCircleIcon size={14} weight="fill" />
                Members Only
              </div>
            </div>

            {/* Benefit 3 — Guest contrast */}
            <div className="bg-[#121212] p-8 rounded-3xl border-2 border-[#fb8500]/30 shadow-xl relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#fb8500]/10 rounded-full blur-2xl" />
              <div className="p-4 bg-white/5 text-[#fff3ec]/50 rounded-2xl border border-white/10 w-fit mb-6">
                <UserIcon size={28} weight="duotone" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Guest Mode: Process & Discard</h3>
              <p className="text-xs text-[#fff3ec]/70 leading-relaxed mb-4">
                In guest mode, your file is processed for immediate download, then permanently purged. Refreshing the page clears session data, requiring a fresh upload.
              </p>
              <div className="flex items-center gap-2 text-[10px] font-bold text-[#fff3ec]/50 uppercase tracking-wider">
                <XCircleIcon size={14} weight="fill" />
                No Reuse · No Saved History
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════ TOOLS PREVIEW GRID ═══════════════════ */}
        <div className="w-full max-w-5xl mb-32 text-left">
          <div className="text-center max-w-xl mx-auto mb-10">
            <span className="inline-block px-3 py-1 rounded-full bg-[#fb8500]/10 border border-[#fb8500]/30 text-[#fb8500] text-[10px] font-bold uppercase tracking-widest mb-3">
              The Toolkit
            </span>
            <h2 className="text-3xl md:text-4xl font-black text-[#121212] mb-3">
              Every Tool You Need. <span className="text-[#fb8500]">One Dashboard.</span>
            </h2>
            <p className="text-sm text-[#555555]">Start free — advanced utilities unlock with your free account.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <Link href="/tools/resize" className="group bg-white p-6 rounded-3xl border-2 border-[#fb8500]/20 hover:border-[#fb8500] shadow-lg shadow-[#fb8500]/5 transition-all cursor-pointer">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-[#fb8500]/10 text-[#fb8500] rounded-2xl group-hover:scale-110 transition-transform">
                  <ImagesIcon size={26} weight="duotone" />
                </div>
                <span className="px-2.5 py-1 rounded-full bg-[#fb8500]/10 text-[#fb8500] text-[9px] font-bold border border-[#fb8500]/20">Available Now</span>
              </div>
              <h3 className="text-base font-bold text-[#121212] mb-1">Image Resize & Format</h3>
              <p className="text-xs text-[#555555] leading-relaxed">Resize, convert formats to WebP/AVIF, and control compression quality.</p>
            </Link>

            <Link href="/signup" className="group bg-white p-6 rounded-3xl border-2 border-[#fb8500]/20 hover:border-[#fb8500] shadow-lg shadow-[#fb8500]/5 transition-all cursor-pointer relative overflow-hidden">
              <div className="absolute top-4 right-4"><LockIcon size={16} weight="fill" className="text-[#555555]/40" /></div>
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-[#fff3ec] text-[#555555]/60 rounded-2xl">
                  <FilePdfIcon size={26} weight="duotone" />
                </div>
                <span className="px-2.5 py-1 rounded-full bg-[#121212] text-white text-[9px] font-bold">Coming Soon</span>
              </div>
              <h3 className="text-base font-bold text-[#121212] mb-1">Files Compress</h3>
              <p className="text-xs text-[#555555] leading-relaxed">Compress various file types to reduce their size without compromising quality.</p>
            </Link>

            <Link href="/signup" className="group bg-white p-6 rounded-3xl border-2 border-[#fb8500]/20 hover:border-[#fb8500] shadow-lg shadow-[#fb8500]/5 transition-all cursor-pointer relative overflow-hidden">
              <div className="absolute top-4 right-4"><LockIcon size={16} weight="fill" className="text-[#555555]/40" /></div>
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-[#fff3ec] text-[#555555]/60 rounded-2xl">
                  <FilePdfIcon size={26} weight="duotone" />
                </div>
                <span className="px-2.5 py-1 rounded-full bg-[#121212] text-white text-[9px] font-bold">Coming Soon</span>
              </div>
              <h3 className="text-base font-bold text-[#121212] mb-1">PDF Converter & Merge</h3>
              <p className="text-xs text-[#555555] leading-relaxed">Convert images to PDF, merge documents, split, and optimize PDFs.</p>
            </Link>

            <Link href="/signup" className="group bg-white p-6 rounded-3xl border-2 border-[#fb8500]/20 hover:border-[#fb8500] shadow-lg shadow-[#fb8500]/5 transition-all cursor-pointer relative overflow-hidden">
              <div className="absolute top-4 right-4"><LockIcon size={16} weight="fill" className="text-[#555555]/40" /></div>
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-[#fff3ec] text-[#555555]/60 rounded-2xl">
                  <FileArchiveIcon size={26} weight="duotone" />
                </div>
                <span className="px-2.5 py-1 rounded-full bg-[#121212] text-white text-[9px] font-bold">Coming Soon</span>
              </div>
              <h3 className="text-base font-bold text-[#121212] mb-1">Bulk ZIP Compressor</h3>
              <p className="text-xs text-[#555555] leading-relaxed">Process up to 50 files simultaneously and export neatly packaged ZIP archives.</p>
            </Link>

            <Link href="/signup" className="group bg-white p-6 rounded-3xl border-2 border-[#fb8500]/20 hover:border-[#fb8500] shadow-lg shadow-[#fb8500]/5 transition-all cursor-pointer relative overflow-hidden">
              <div className="absolute top-4 right-4"><LockIcon size={16} weight="fill" className="text-[#555555]/40" /></div>
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-[#fff3ec] text-[#555555]/60 rounded-2xl">
                  <FolderIcon size={26} weight="duotone" />
                </div>
                <span className="px-2.5 py-1 rounded-full bg-[#121212] text-white text-[9px] font-bold">Coming Soon</span>
              </div>
              <h3 className="text-base font-bold text-[#121212] mb-1">Job History & Cloud</h3>
              <p className="text-xs text-[#555555] leading-relaxed">All processing outputs are securely saved to your account history.</p>
            </Link>

            <Link href="/signup" className="group bg-white p-6 rounded-3xl border-2 border-[#fb8500]/20 hover:border-[#fb8500] shadow-lg shadow-[#fb8500]/5 transition-all cursor-pointer relative overflow-hidden">
              <div className="absolute top-4 right-4"><LockIcon size={16} weight="fill" className="text-[#555555]/40" /></div>
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-[#fff3ec] text-[#555555]/60 rounded-2xl">
                  <ClockIcon size={26} weight="duotone" />
                </div>
                <span className="px-2.5 py-1 rounded-full bg-[#121212] text-white text-[9px] font-bold">Coming Soon</span>
              </div>
              <h3 className="text-base font-bold text-[#121212] mb-1">Priority Processing Queue</h3>
              <p className="text-xs text-[#555555] leading-relaxed">Skip the server queue and get your jobs processed instantly.</p>
            </Link>
          </div>
        </div>

        {/* ═══════════════════ HOW IT WORKS ═══════════════════ */}
        <div className="w-full mb-24 text-left">
          <div className="text-center max-w-xl mx-auto mb-14">
            <h2 className="text-3xl font-black text-[#121212] mb-3">How Our Suite Works</h2>
            <p className="text-sm text-[#555555]">Access any utility, configure your parameters, and export in seconds.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
                  Select your desired utility and drop your files securely into the browser workspace.
                </p>
              </div>
            </div>

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
                  Apply custom dimensions, scaling rules, or format parameters with real-time preview rendering.
                </p>
              </div>
            </div>

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
                  Export your optimized, high-quality assets instantly with absolute data privacy.
                </p>
              </div>
            </div>
          </div>
        </div>

      </main>

      {/* Cookie Consent Banner */}
      {cookieConsent !== "accepted" && cookieConsent !== "rejected" && cookieConsent !== "loading" && (
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
                onClick={() => handleConsentAction("rejected")}
                className="px-5 py-2.5 rounded-xl border border-white/20 text-white text-sm font-bold hover:bg-white/10 transition-colors cursor-pointer"
              >
                Reject
              </button>
              <button
                onClick={() => handleConsentAction("accepted")}
                className="px-6 py-2.5 rounded-xl bg-[#fb8500] hover:bg-[#e07600] text-white text-sm font-bold transition-all shadow-md shadow-[#fb8500]/30 cursor-pointer"
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