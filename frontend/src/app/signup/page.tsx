"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import { UserIcon, EnvelopeSimpleIcon, LockSimpleIcon, EyeIcon, EyeSlashIcon, ArrowRightIcon, ShieldCheckIcon } from "@phosphor-icons/react/dist/ssr";
import { useAuth } from "@/hooks/useAuth";

export default function SignUpPage() {
  const [step, setStep] = useState<"form" | "otp">("form");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");

  // Consent States
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [analyticsConsent, setAnalyticsConsent] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);

  // Resend OTP timer states
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const { signupUser, verifyOtp, resendOtp, loading, error } = useAuth();

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === "otp" && resendTimer > 0) {
      timer = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    } else if (resendTimer === 0) {
      setCanResend(true);
    }
    return () => clearInterval(timer);
  }, [step, resendTimer]);

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!termsAccepted) {
      alert("Please accept the Terms & Conditions and Privacy Policy to continue.");
      return;
    }

    const res = await signupUser(fullName, email, password, {
      termsAndPrivacyAccepted: termsAccepted,
      analyticsConsent,
      marketingConsent,
    });

    if (res.success) {
      localStorage.setItem("meettools_temp_email", email);
      setStep("otp");
      setResendTimer(60);
      setCanResend(false);
    } else {
      alert(res.message || "Failed to register. Please try again.");
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      alert("Please enter a valid 6-digit verification code.");
      return;
    }

    const res = await verifyOtp(email, otp);
    if (!res.success) {
      alert(res.message || "Invalid OTP code.");
    }
  };

  const handleResendOtpCode = async () => {
    if (!canResend) return;
    const res = await resendOtp(email);
    if (res.success) {
      alert("Verification code has been successfully resent to your email.");
      setResendTimer(60);
      setCanResend(false);
    } else {
      alert(res.message || "Failed to resend OTP.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fff3ec] text-[#121212] font-sans">
      <Navbar />

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-white rounded-3xl p-8 border border-[#fb8500]/20 shadow-xl shadow-[#fb8500]/5">

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-semibold">
              {error}
            </div>
          )}

          {step === "form" ? (
            <>
              <div className="text-center mb-8">
                <h1 className="text-3xl font-black text-[#121212] mb-2">Create Account</h1>
                <p className="text-sm text-[#555555]">Start optimizing your media pipeline today</p>
              </div>

              <div className="flex bg-[#fff3ec] p-1.5 rounded-2xl mb-8 border border-[#fb8500]/10">
                <Link
                  href="/login"
                  className="flex-1 text-center py-2.5 rounded-xl font-bold text-sm text-[#555555] hover:text-[#fb8500] transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="flex-1 text-center py-2.5 rounded-xl font-bold text-sm bg-[#fb8500] text-white shadow-md transition-all"
                >
                  Sign Up
                </Link>
              </div>

              <form onSubmit={handleRegisterSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-[#333333] mb-2 uppercase tracking-wider">
                    Full Name
                  </label>
                  <div className="relative flex items-center">
                    <UserIcon size={20} className="absolute left-4 text-[#fb8500]" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full pl-12 pr-4 py-3.5 bg-[#fff3ec]/50 border border-[#fb8500]/20 rounded-2xl text-sm focus:outline-none focus:border-[#fb8500] focus:bg-white transition-all text-[#121212]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#333333] mb-2 uppercase tracking-wider">
                    Email Address
                  </label>
                  <div className="relative flex items-center">
                    <EnvelopeSimpleIcon size={20} className="absolute left-4 text-[#fb8500]" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full pl-12 pr-4 py-3.5 bg-[#fff3ec]/50 border border-[#fb8500]/20 rounded-2xl text-sm focus:outline-none focus:border-[#fb8500] focus:bg-white transition-all text-[#121212]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#333333] mb-2 uppercase tracking-wider">
                    Password
                  </label>
                  <div className="relative flex items-center">
                    <LockSimpleIcon size={20} className="absolute left-4 text-[#fb8500]" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      className="w-full pl-12 pr-12 py-3.5 bg-[#fff3ec]/50 border border-[#fb8500]/20 rounded-2xl text-sm focus:outline-none focus:border-[#fb8500] focus:bg-white transition-all text-[#121212]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 text-[#888888] hover:text-[#fb8500]"
                    >
                      {showPassword ? <EyeSlashIcon size={20} /> : <EyeIcon size={20} />}
                    </button>
                  </div>
                </div>

                {/* Terms and Consents Checkboxes */}
                <div className="space-y-3 pt-2 text-xs">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      required
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="mt-0.5 accent-[#fb8500] rounded"
                    />
                    <span className="text-[#555555]">
                      I agree to the <Link href="/terms" className="text-[#fb8500] underline font-bold">Terms & Conditions</Link> and <Link href="/privacy" className="text-[#fb8500] underline font-bold">Privacy Policy</Link>.
                    </span>
                  </label>

                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={analyticsConsent}
                      onChange={(e) => setAnalyticsConsent(e.target.checked)}
                      className="mt-0.5 accent-[#fb8500] rounded"
                    />
                    <span className="text-[#555555]">
                      Allow analytics cookies to help us improve platform performance.
                    </span>
                  </label>

                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={marketingConsent}
                      onChange={(e) => setMarketingConsent(e.target.checked)}
                      className="mt-0.5 accent-[#fb8500] rounded"
                    />
                    <span className="text-[#555555]">
                      Receive product updates, new features, and tool recommendations.
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-[#fb8500] hover:bg-[#e07600] text-white font-bold rounded-2xl transition-all shadow-lg shadow-[#fb8500]/30 flex items-center justify-center gap-2 text-base mt-4 disabled:opacity-50"
                >
                  {loading ? "Sending OTP..." : "Continue to Verify Email"}
                  {!loading && <ArrowRightIcon size={20} weight="bold" />}
                </button>
              </form>

              <p className="text-center text-xs text-[#777777] mt-6">
                Already have an account?{" "}
                <Link href="/login" className="font-bold text-[#fb8500] hover:underline">
                  Sign In
                </Link>
              </p>
            </>
          ) : (
            /* OTP Verification Step */
            <>
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-[#fb8500]/10 text-[#fb8500] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#fb8500]/20">
                  <ShieldCheckIcon size={32} weight="duotone" />
                </div>
                <h1 className="text-2xl font-black text-[#121212] mb-2">Verify Your Email</h1>
                <p className="text-sm text-[#555555]">
                  We have sent a 6-digit verification code to <span className="font-bold text-[#121212]">{email}</span>
                </p>
              </div>

              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <div>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="123456"
                    className="w-full py-4 text-center tracking-[1em] text-2xl font-black bg-[#fff3ec]/50 border border-[#fb8500]/20 rounded-2xl focus:outline-none focus:border-[#fb8500] text-[#121212]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-[#fb8500] hover:bg-[#e07600] text-white font-bold rounded-2xl transition-all shadow-lg shadow-[#fb8500]/30 flex items-center justify-center gap-2 text-base disabled:opacity-50"
                >
                  {loading ? "Verifying..." : "Verify & Proceed"}
                  {!loading && <ArrowRightIcon size={20} weight="bold" />}
                </button>

                <div className="text-center flex flex-col gap-3 pt-2 border-t border-[#fb8500]/10 mt-6">
                  <button
                    type="button"
                    onClick={handleResendOtpCode}
                    disabled={!canResend || loading}
                    className={`text-xs font-bold transition-colors ${canResend ? "text-[#fb8500] hover:underline cursor-pointer" : "text-gray-400 cursor-not-allowed"
                      }`}
                  >
                    {canResend ? "Didn't receive code? Resend OTP" : `Resend code available in ${resendTimer}s`}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep("form")}
                    className="text-xs font-bold text-[#555555] hover:text-[#fb8500]"
                  >
                    ← Back to Sign Up Details
                  </button>
                </div>
              </form>
            </>
          )}

        </div>
      </main>
    </div>
  );
}