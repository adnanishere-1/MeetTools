"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import { ShieldCheckIcon, ArrowRightIcon, ArrowLeftIcon, SpinnerGapIcon } from "@phosphor-icons/react/dist/ssr";
import { useAuth } from "@/hooks/useAuth"; // Aapka banaya hua custom hook

export default function OtpPage() {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(60); // 60 seconds countdown
  const [canResend, setCanResend] = useState(false);
  
  const { verifyOtp, resendOtp } = useAuth();

  // Countdown timer effect for Resend OTP
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendTimer > 0) {
      timer = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    } else {
      setCanResend(true);
    }
    return () => clearInterval(timer);
  }, [resendTimer]);

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      alert("Please enter a valid 6-digit OTP code.");
      return;
    }

    setLoading(true);

    // Get user email saved during signup step (fallback to default if testing direct)
    const storedUser = localStorage.getItem("meettools_temp_email") || "user@example.com";

    // Call verifyOtp from useAuth hook
    const res = await verifyOtp(storedUser, otp);

    if (!res.success) {
      alert(res.message || "Invalid OTP code. Please try again.");
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend) return;

    const storedUser = localStorage.getItem("meettools_temp_email") || "user@example.com";
    
    const res = await resendOtp(storedUser);
    if (res.success) {
      alert("Verification code has been successfully resent to your email.");
      setResendTimer(60); // Reset timer to 60 seconds
      setCanResend(false);
    } else {
      alert(res.message || "Failed to resend OTP. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fff3ec] text-[#121212] font-sans">
      <Navbar />

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-white rounded-3xl p-8 border border-[#fb8500]/20 shadow-xl shadow-[#fb8500]/5 text-center">
          
          {/* Icon Badge */}
          <div className="w-16 h-16 bg-[#fb8500]/10 text-[#fb8500] rounded-2xl flex items-center justify-center mx-auto mb-6 border border-[#fb8500]/20 shadow-inner">
            <ShieldCheckIcon size={36} weight="duotone" />
          </div>

          {/* Heading */}
          <h1 className="text-3xl font-black text-[#121212] mb-2">Verify Your Account</h1>
          <p className="text-sm text-[#555555] mb-8 leading-relaxed">
            Please enter the 6-digit security verification code sent to your registered email address.
          </p>

          {/* Form */}
          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-[#333333] mb-3 uppercase tracking-wider">
                Enter 6-Digit OTP Code
              </label>
              <input
                type="text"
                maxLength={6}
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                className="w-full py-4 text-center tracking-[0.8em] text-2xl font-black bg-[#fff3ec]/50 border border-[#fb8500]/20 rounded-2xl focus:outline-none focus:border-[#fb8500] focus:bg-white transition-all text-[#121212] placeholder-[#888888]"
              />
            </div>

            {/* Verify Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-[#fb8500] hover:bg-[#e07600] text-white font-bold rounded-2xl transition-all shadow-lg shadow-[#fb8500]/30 flex items-center justify-center gap-2 text-base disabled:opacity-50"
            >
              {loading ? "Verifying Code..." : "Verify & Proceed"}
              {!loading && <ArrowRightIcon size={20} weight="bold" />}
            </button>
          </form>

          {/* Resend & Back Links */}
          <div className="mt-8 pt-6 border-t border-[#fb8500]/10 flex flex-col gap-3">
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={!canResend}
              className={`text-xs font-bold transition-colors ${
                canResend 
                  ? "text-[#fb8500] hover:underline cursor-pointer" 
                  : "text-gray-400 cursor-not-allowed"
              }`}
            >
              {canResend 
                ? "Didn't receive code? Resend OTP" 
                : `Resend code available in ${resendTimer}s`}
            </button>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-[#555555] hover:text-[#fb8500] transition-colors"
            >
              <ArrowLeftIcon size={14} /> Back to Sign Up
            </Link>
          </div>

        </div>
      </main>
    </div>
  );
}