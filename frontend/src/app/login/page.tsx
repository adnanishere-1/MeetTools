
"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

import Navbar from "@/components/layout/Navbar";

// Directly import from AuthContext
import { useAuth } from "@/context/AuthContext";

import {
  EnvelopeSimpleIcon,
  LockSimpleIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowRightIcon,
} from "@phosphor-icons/react/dist/ssr";

export default function LoginPage() {
  const { loginUser, loading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [errorMsg, setErrorMsg] =
    useState("");

  // =====================================
  // Login Handler
  // =====================================

  const handleSubmit = async (
    e: FormEvent<HTMLFormElement>
  ): Promise<void> => {
    e.preventDefault();

    if (loading) return;

    setErrorMsg("");

    const normalizedEmail =
      email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      setErrorMsg(
        "Please enter your email and password."
      );
      return;
    }

    try {
      // AuthContext handles:
      // - API request
      // - HttpOnly cookie authentication
      // - user state
      // - dashboard redirect
      const result = await loginUser(
        normalizedEmail,
        password
      );

      if (!result.success) {
        setErrorMsg(
          result.message ||
            "Invalid email or password."
        );
      }
    } catch {
      setErrorMsg(
        "Something went wrong. Please try again."
      );
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fff3ec] text-[#121212] font-sans">
      <Navbar />

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-white rounded-3xl p-8 border border-[#fb8500]/20 shadow-xl shadow-[#fb8500]/5">
          {/* Heading */}

          <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-[#121212] mb-2">
              Welcome Back
            </h1>

            <p className="text-sm text-[#555555]">
              Sign in to access your dashboard
            </p>
          </div>

          {/* Error Message */}

          {errorMsg && (
            <div
              role="alert"
              className="mb-6 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs text-center font-medium"
            >
              {errorMsg}
            </div>
          )}

          {/* Login / Signup Tabs */}

          <div className="flex bg-[#fff3ec] p-1.5 rounded-2xl mb-8 border border-[#fb8500]/10">
            <Link
              href="/login"
              className="flex-1 text-center py-2.5 rounded-xl font-bold text-sm bg-[#fb8500] text-white shadow-md transition-all"
            >
              Sign In
            </Link>

            <Link
              href="/signup"
              className="flex-1 text-center py-2.5 rounded-xl font-bold text-sm text-[#555555] hover:text-[#fb8500] transition-colors"
            >
              Sign Up
            </Link>
          </div>

          {/* Login Form */}

          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            {/* Email Field */}

            <div>
              <label
                htmlFor="login-email"
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
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  placeholder="name@example.com"
                  autoComplete="email"
                  disabled={loading}
                  className="w-full pl-12 pr-4 py-3.5 bg-[#fff3ec]/50 border border-[#fb8500]/20 rounded-2xl text-sm focus:outline-none focus:border-[#fb8500] focus:bg-white transition-all text-[#121212] placeholder-[#888888]"
                />
              </div>
            </div>

            {/* Password Field */}

            <div>
              <div className="flex justify-between items-center mb-2">
                <label
                  htmlFor="login-password"
                  className="text-xs font-bold text-[#333333] uppercase tracking-wider"
                >
                  Password
                </label>

                <Link
                  href="#"
                  className="text-xs font-bold text-[#fb8500] hover:underline"
                >
                  Forgot Password?
                </Link>
              </div>

              <div className="relative flex items-center">
                <LockSimpleIcon
                  size={20}
                  className="absolute left-4 text-[#fb8500]"
                />

                <input
                  id="login-password"
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
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={loading}
                  className="w-full pl-12 pr-12 py-3.5 bg-[#fff3ec]/50 border border-[#fb8500]/20 rounded-2xl text-sm focus:outline-none focus:border-[#fb8500] focus:bg-white transition-all text-[#121212] placeholder-[#888888]"
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
                  className="absolute right-4 text-[#888888] hover:text-[#fb8500] transition-colors cursor-pointer"
                >
                  {showPassword ? (
                    <EyeSlashIcon size={20} />
                  ) : (
                    <EyeIcon size={20} />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-[#fb8500] hover:bg-[#e07600] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-2xl transition-all shadow-lg shadow-[#fb8500]/30 flex items-center justify-center gap-2 text-base mt-2 cursor-pointer"
            >
              {loading
                ? "Signing In..."
                : "Sign In"}

              {!loading && (
                <ArrowRightIcon
                  size={20}
                  weight="bold"
                />
              )}
            </button>
          </form>

          {/* Signup Link */}

          <p className="text-center text-xs text-[#777777] mt-8">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="font-bold text-[#fb8500] hover:underline"
            >
              Create One
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
