
"use client";

import {
  useState,
  useEffect,
  type FormEvent,
} from "react";

import {
  useSearchParams,
} from "next/navigation";

import Link from "next/link";
import Navbar from "@/components/layout/Navbar";

import {
  ShieldCheckIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  SpinnerGapIcon,
} from "@phosphor-icons/react/dist/ssr";

import { useAuth } from "@/hooks/useAuth";

export default function OtpPage() {
  const searchParams = useSearchParams();

  // Email comes from signup redirect URL
  // Example: /verify-otp?email=user%40example.com
  const emailFromUrl =
    searchParams.get("email")?.trim() || "";

  const [email, setEmail] = useState(emailFromUrl);

  const [otp, setOtp] = useState("");

  const [loading, setLoading] = useState(false);

  const [resending, setResending] =
    useState(false);

  const [resendTimer, setResendTimer] =
    useState(60);

  const [message, setMessage] = useState<
    string | null
  >(null);

  const [error, setError] = useState<
    string | null
  >(null);

  const { verifyOtp, resendOtp } = useAuth();

  // Update email if URL changes
  useEffect(() => {
    setEmail(emailFromUrl);
  }, [emailFromUrl]);

  // 60-second countdown
  useEffect(() => {
    if (resendTimer <= 0) return;

    const timer = window.setTimeout(() => {
      setResendTimer((previous) =>
        Math.max(previous - 1, 0)
      );
    }, 1000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [resendTimer]);

  const canResend =
    resendTimer === 0 &&
    !loading &&
    !resending;

  // Validate email
  const isValidEmail = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      value.trim()
    );
  };

  // Verify OTP
  const handleVerifyOtp = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError(null);
    setMessage(null);

    const normalizedEmail =
      email.trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      setError(
        "Please enter your registered email address."
      );
      return;
    }

    if (!/^\d{6}$/.test(otp)) {
      setError(
        "Please enter a valid 6-digit OTP code."
      );
      return;
    }

    if (loading) return;

    setLoading(true);

    try {
      // Existing useAuth hook calls backend
      // No localStorage / Bearer token needed
      const response = await verifyOtp(
        normalizedEmail,
        otp
      );

      if (!response.success) {
        setError(
          response.message ||
            "Invalid OTP code. Please try again."
        );
        return;
      }

      // Redirect is handled by useAuth.verifyOtp
      setMessage(
        response.message ||
          "Email verified successfully."
      );
    } catch (err) {
      console.error(
        "OTP verification failed:",
        err
      );

      setError(
        "Unable to verify OTP. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (!canResend) return;

    setError(null);
    setMessage(null);

    const normalizedEmail =
      email.trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      setError(
        "Please enter your registered email address."
      );
      return;
    }

    setResending(true);

    try {
      const response = await resendOtp(
        normalizedEmail
      );

      if (response.success) {
        setMessage(
          "Verification code has been successfully resent to your email."
        );

        setOtp("");
        setResendTimer(60);
      } else {
        setError(
          response.message ||
            "Failed to resend OTP. Please try again."
        );
      }
    } catch (err) {
      console.error(
        "Resend OTP failed:",
        err
      );

      setError(
        "Unable to resend OTP. Please try again."
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fff3ec] text-[#121212] font-sans">
      <Navbar />

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-white rounded-3xl p-8 border border-[#fb8500]/20 shadow-xl shadow-[#fb8500]/5 text-center">
          {/* Icon Badge */}
          <div className="w-16 h-16 bg-[#fb8500]/10 text-[#fb8500] rounded-2xl flex items-center justify-center mx-auto mb-6 border border-[#fb8500]/20 shadow-inner">
            <ShieldCheckIcon
              size={36}
              weight="duotone"
            />
          </div>

          {/* Heading */}
          <h1 className="text-3xl font-black text-[#121212] mb-2">
            Verify Your Account
          </h1>

          <p className="text-sm text-[#555555] mb-8 leading-relaxed">
            Please enter the 6-digit security
            verification code sent to your
            registered email address.
          </p>

          {/* OTP Form */}
          <form
            onSubmit={handleVerifyOtp}
            className="space-y-6"
          >
            {/* Registered Email */}
            <div>
              <label
                htmlFor="otp-email"
                className="block text-xs font-bold text-[#333333] mb-3 uppercase tracking-wider"
              >
                Registered Email Address
              </label>

              <input
                id="otp-email"
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setError(null);
                }}
                placeholder="you@example.com"
                autoComplete="email"
                required
                disabled={loading || resending}
                className="w-full px-4 py-3 text-sm font-semibold bg-[#fff3ec]/50 border border-[#fb8500]/20 rounded-2xl focus:outline-none focus:border-[#fb8500] focus:bg-white transition-all text-[#121212] disabled:opacity-60"
              />
            </div>

            {/* OTP Input */}
            <div>
              <label
                htmlFor="otp-code"
                className="block text-xs font-bold text-[#333333] mb-3 uppercase tracking-wider"
              >
                Enter 6-Digit OTP Code
              </label>

              <input
                id="otp-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                autoComplete="one-time-code"
                value={otp}
                onChange={(event) => {
                  const numericValue =
                    event.target.value.replace(
                      /\D/g,
                      ""
                    );

                  setOtp(
                    numericValue.slice(0, 6)
                  );

                  setError(null);
                }}
                placeholder="123456"
                disabled={loading || resending}
                className="w-full py-4 text-center tracking-[0.5em] text-2xl font-black bg-[#fff3ec]/50 border border-[#fb8500]/20 rounded-2xl focus:outline-none focus:border-[#fb8500] focus:bg-white transition-all text-[#121212] placeholder-[#888888] disabled:opacity-60"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div
                role="alert"
                className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs font-semibold rounded-xl"
              >
                {error}
              </div>
            )}

            {/* Success Message */}
            {message && (
              <div
                role="status"
                className="p-3 bg-green-50 border border-green-200 text-green-700 text-xs font-semibold rounded-xl"
              >
                {message}
              </div>
            )}

            {/* Verify Button */}
            <button
              type="submit"
              disabled={
                loading ||
                resending ||
                otp.length !== 6
              }
              className="w-full py-4 bg-[#fb8500] hover:bg-[#e07600] text-white font-bold rounded-2xl transition-all shadow-lg shadow-[#fb8500]/30 flex items-center justify-center gap-2 text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <SpinnerGapIcon
                    size={20}
                    className="animate-spin"
                  />

                  Verifying Code...
                </>
              ) : (
                <>
                  Verify & Proceed

                  <ArrowRightIcon
                    size={20}
                    weight="bold"
                  />
                </>
              )}
            </button>
          </form>

          {/* Resend and Back Links */}
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
              {resending
                ? "Resending OTP..."
                : canResend
                  ? "Didn't receive code? Resend OTP"
                  : `Resend code available in ${resendTimer}s`}
            </button>

            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-[#555555] hover:text-[#fb8500] transition-colors"
            >
              <ArrowLeftIcon size={14} />
              Back to Sign Up
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
