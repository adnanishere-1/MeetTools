
"use client";

import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import Link from "next/link";

import Navbar from "@/components/layout/Navbar";
import { useAuth } from "@/context/AuthContext";

import {
  UserIcon,
  EnvelopeSimpleIcon,
  LockSimpleIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowRightIcon,
  ShieldCheckIcon,
  CheckIcon,
  XIcon,
} from "@phosphor-icons/react/dist/ssr";

export default function SignUpPage() {
  const [step, setStep] =
    useState<"form" | "otp">("form");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] =
    useState(false);
  const [otp, setOtp] = useState("");

  // Consent states
  const [termsAccepted, setTermsAccepted] =
    useState(false);

  const [analyticsConsent, setAnalyticsConsent] =
    useState(false);

  const [marketingConsent, setMarketingConsent] =
    useState(false);

  // OTP resend timer
  const [resendTimer, setResendTimer] =
    useState(60);

  const [canResend, setCanResend] =
    useState(false);

  // Authentication directly from AuthContext
  const {
    signupUser,
    verifyOtp,
    resendOtp,
    loading,
    error,
  } = useAuth();

  // Password validation
  const rules = {
    minLength: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password),
  };

  const isPasswordStrong =
    Object.values(rules).every(Boolean);

  // OTP countdown
  useEffect(() => {
    if (step !== "otp" || resendTimer <= 0) {
      return;
    }

    const timer = setTimeout(() => {
      setResendTimer((previous) =>
        Math.max(0, previous - 1)
      );
    }, 1000);

    return () => clearTimeout(timer);
  }, [step, resendTimer]);

  // Enable resend when countdown reaches zero
  useEffect(() => {
    if (step === "otp" && resendTimer === 0) {
      setCanResend(true);
    }
  }, [step, resendTimer]);

  // =====================================
  // Register user
  // =====================================

  const handleRegisterSubmit = async (
    e: FormEvent<HTMLFormElement>
  ): Promise<void> => {
    e.preventDefault();

    if (loading) return;

    if (!isPasswordStrong) {
      alert(
        "Please ensure your password meets all security criteria."
      );
      return;
    }

    if (!termsAccepted) {
      alert(
        "Please accept the Terms & Conditions and Privacy Policy to continue."
      );
      return;
    }

    const normalizedEmail =
      email.trim().toLowerCase();

    try {
      const result = await signupUser(
        fullName.trim(),
        normalizedEmail,
        password,
        {
          termsAndPrivacyAccepted: termsAccepted,
          analyticsConsent,
          marketingConsent,
        }
      );

      if (result.success) {
        setEmail(normalizedEmail);
        setOtp("");
        setStep("otp");
        setResendTimer(60);
        setCanResend(false);
      } else {
        alert(
          result.message ||
            "Failed to register. Please try again."
        );
      }
    } catch {
      alert(
        "Registration failed. Please try again."
      );
    }
  };

  // =====================================
  // Verify OTP
  // =====================================

  const handleVerifyOtp = async (
    e: FormEvent<HTMLFormElement>
  ): Promise<void> => {
    e.preventDefault();

    if (loading) return;

    if (!/^\d{6}$/.test(otp)) {
      alert(
        "Please enter a valid 6-digit verification code."
      );
      return;
    }

    try {
      const result = await verifyOtp(
        email,
        otp
      );

      if (!result.success) {
        alert(
          result.message ||
            "Invalid OTP code."
        );
      }

      // Successful verification redirects
      // through AuthContext.
    } catch {
      alert(
        "OTP verification failed. Please try again."
      );
    }
  };

  // =====================================
  // Resend OTP
  // =====================================

  const handleResendOtpCode =
    async (): Promise<void> => {
      if (!canResend || loading) return;

      try {
        const result = await resendOtp(
          email
        );

        if (result.success) {
          alert(
            "Verification code has been successfully resent to your email."
          );

          setOtp("");
          setResendTimer(60);
          setCanResend(false);
        } else {
          alert(
            result.message ||
              "Failed to resend OTP."
          );
        }
      } catch {
        alert(
          "Failed to resend OTP. Please try again."
        );
      }
    };

  return (
    <div className="min-h-screen flex flex-col bg-[#fff3ec] text-[#121212] font-sans">
      <Navbar />

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-white rounded-3xl p-8 border border-[#fb8500]/20 shadow-xl shadow-[#fb8500]/5">
          {/* Error Message */}

          {error && (
            <div
              role="alert"
              className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-semibold"
            >
              {error}
            </div>
          )}

          {step === "form" ? (
            <>
              {/* Signup heading */}

              <div className="text-center mb-8">
                <h1 className="text-3xl font-black text-[#121212] mb-2">
                  Create Account
                </h1>

                <p className="text-sm text-[#555555]">
                  Start optimizing your media pipeline today
                </p>
              </div>

              {/* Login / Signup tabs */}

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

              {/* Registration form */}

              <form
                onSubmit={handleRegisterSubmit}
                className="space-y-5"
              >
                {/* Full Name */}

                <div>
                  <label
                    htmlFor="signup-name"
                    className="block text-xs font-bold text-[#333333] mb-2 uppercase tracking-wider"
                  >
                    Full Name
                  </label>

                  <div className="relative flex items-center">
                    <UserIcon
                      size={20}
                      className="absolute left-4 text-[#fb8500]"
                    />

                    <input
                      id="signup-name"
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) =>
                        setFullName(e.target.value)
                      }
                      placeholder="John Doe"
                      autoComplete="name"
                      disabled={loading}
                      className="w-full pl-12 pr-4 py-3.5 bg-[#fff3ec]/50 border border-[#fb8500]/20 rounded-2xl text-sm focus:outline-none focus:border-[#fb8500] focus:bg-white transition-all text-[#121212]"
                    />
                  </div>
                </div>

                {/* Email Address */}

                <div>
                  <label
                    htmlFor="signup-email"
                    className="block text-xs font-bold text-[#333333] mb-2 uppercase tracking-wider"
                  >
                    Email Address
                  </label>

                  <div className="relative flex items-center">
                    <EnvelopeSimpleIcon
                      size={20}
                      className="absolute left-4 text-[#fb8500]"
                    />

                    <input
                      id="signup-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) =>
                        setEmail(e.target.value)
                      }
                      placeholder="name@example.com"
                      autoComplete="email"
                      disabled={loading}
                      className="w-full pl-12 pr-4 py-3.5 bg-[#fff3ec]/50 border border-[#fb8500]/20 rounded-2xl text-sm focus:outline-none focus:border-[#fb8500] focus:bg-white transition-all text-[#121212]"
                    />
                  </div>
                </div>

                {/* Password */}

                <div>
                  <label
                    htmlFor="signup-password"
                    className="block text-xs font-bold text-[#333333] mb-2 uppercase tracking-wider"
                  >
                    Password
                  </label>

                  <div className="relative flex items-center">
                    <LockSimpleIcon
                      size={20}
                      className="absolute left-4 text-[#fb8500]"
                    />

                    <input
                      id="signup-password"
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      required
                      value={password}
                      onChange={(e) =>
                        setPassword(e.target.value)
                      }
                      placeholder="8+ chars, Uppercase, Number, Special"
                      autoComplete="new-password"
                      disabled={loading}
                      className="w-full pl-12 pr-12 py-3.5 bg-[#fff3ec]/50 border border-[#fb8500]/20 rounded-2xl text-sm focus:outline-none focus:border-[#fb8500] focus:bg-white transition-all text-[#121212]"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(
                          (previous) => !previous
                        )
                      }
                      aria-label={
                        showPassword
                          ? "Hide password"
                          : "Show password"
                      }
                      aria-pressed={showPassword}
                      className="absolute right-4 text-[#888888] hover:text-[#fb8500]"
                    >
                      {showPassword ? (
                        <EyeSlashIcon size={20} />
                      ) : (
                        <EyeIcon size={20} />
                      )}
                    </button>
                  </div>

                  {/* Password requirements */}

                  {password.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {[
                        {
                          label: "8+ Chars",
                          valid: rules.minLength,
                        },
                        {
                          label: "Uppercase",
                          valid: rules.hasUpper,
                        },
                        {
                          label: "Lowercase",
                          valid: rules.hasLower,
                        },
                        {
                          label: "Number",
                          valid: rules.hasNumber,
                        },
                        {
                          label: "Special (!@#$)",
                          valid: rules.hasSpecial,
                        },
                      ].map((rule) => (
                        <span
                          key={rule.label}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                            rule.valid
                              ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                              : "bg-gray-50 text-gray-400 border-gray-200"
                          }`}
                        >
                          {rule.valid ? (
                            <CheckIcon
                              size={12}
                              weight="bold"
                            />
                          ) : (
                            <XIcon size={12} />
                          )}

                          {rule.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Terms and Consents */}

                <div className="space-y-3 pt-2 text-xs">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      required
                      checked={termsAccepted}
                      onChange={(e) =>
                        setTermsAccepted(
                          e.target.checked
                        )
                      }
                      disabled={loading}
                      className="mt-0.5 accent-[#fb8500] rounded"
                    />

                    <span className="text-[#555555]">
                      I agree to the{" "}
                      <Link
                        href="/terms"
                        className="text-[#fb8500] underline font-bold"
                      >
                        Terms &amp; Conditions
                      </Link>{" "}
                      and{" "}
                      <Link
                        href="/privacy"
                        className="text-[#fb8500] underline font-bold"
                      >
                        Privacy Policy
                      </Link>
                      .
                    </span>
                  </label>

                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={analyticsConsent}
                      onChange={(e) =>
                        setAnalyticsConsent(
                          e.target.checked
                        )
                      }
                      disabled={loading}
                      className="mt-0.5 accent-[#fb8500] rounded"
                    />

                    <span className="text-[#555555]">
                      Allow analytics cookies to help us
                      improve platform performance.
                    </span>
                  </label>

                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={marketingConsent}
                      onChange={(e) =>
                        setMarketingConsent(
                          e.target.checked
                        )
                      }
                      disabled={loading}
                      className="mt-0.5 accent-[#fb8500] rounded"
                    />

                    <span className="text-[#555555]">
                      Receive product updates, new features,
                      and tool recommendations.
                    </span>
                  </label>
                </div>

                {/* Register Button */}

                <button
                  type="submit"
                  disabled={
                    loading ||
                    !isPasswordStrong ||
                    !termsAccepted
                  }
                  className="w-full py-4 bg-[#fb8500] hover:bg-[#e07600] text-white font-bold rounded-2xl transition-all shadow-lg shadow-[#fb8500]/30 flex items-center justify-center gap-2 text-base mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading
                    ? "Sending OTP..."
                    : "Continue"}

                  {!loading && (
                    <ArrowRightIcon
                      size={20}
                      weight="bold"
                    />
                  )}
                </button>
              </form>

              <p className="text-center text-xs text-[#777777] mt-6">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="font-bold text-[#fb8500] hover:underline"
                >
                  Sign In
                </Link>
              </p>
            </>
          ) : (
            <>
              {/* OTP Verification */}

              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-[#fb8500]/10 text-[#fb8500] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#fb8500]/20">
                  <ShieldCheckIcon
                    size={32}
                    weight="duotone"
                  />
                </div>

                <h1 className="text-2xl font-black text-[#121212] mb-2">
                  Verify Your Email
                </h1>

                <p className="text-sm text-[#555555]">
                  We have sent a 6-digit verification
                  code to{" "}
                  <span className="font-bold text-[#121212]">
                    {email}
                  </span>
                </p>
              </div>

              <form
                onSubmit={handleVerifyOtp}
                className="space-y-6"
              >
                <div>
                  <label
                    htmlFor="verification-otp"
                    className="sr-only"
                  >
                    Verification code
                  </label>

                  <input
                    id="verification-otp"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    required
                    value={otp}
                    onChange={(e) =>
                      setOtp(
                        e.target.value
                          .replace(/\D/g, "")
                          .slice(0, 6)
                      )
                    }
                    placeholder="123456"
                    autoComplete="one-time-code"
                    disabled={loading}
                    className="w-full py-4 text-center tracking-[1em] text-2xl font-black bg-[#fff3ec]/50 border border-[#fb8500]/20 rounded-2xl focus:outline-none focus:border-[#fb8500] text-[#121212]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={
                    loading || otp.length !== 6
                  }
                  className="w-full py-4 bg-[#fb8500] hover:bg-[#e07600] text-white font-bold rounded-2xl transition-all shadow-lg shadow-[#fb8500]/30 flex items-center justify-center gap-2 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading
                    ? "Verifying..."
                    : "Verify & Proceed"}

                  {!loading && (
                    <ArrowRightIcon
                      size={20}
                      weight="bold"
                    />
                  )}
                </button>

                <div className="text-center flex flex-col gap-3 pt-2 border-t border-[#fb8500]/10 mt-6">
                  <button
                    type="button"
                    onClick={handleResendOtpCode}
                    disabled={
                      !canResend || loading
                    }
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

                  <button
                    type="button"
                    onClick={() =>
                      setStep("form")
                    }
                    disabled={loading}
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
