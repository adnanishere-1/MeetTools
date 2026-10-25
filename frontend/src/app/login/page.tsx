"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import { EnvelopeSimpleIcon, LockSimpleIcon, EyeIcon, EyeSlashIcon, ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      // Set session so dashboard unlocks
      localStorage.setItem("meettools_user", JSON.stringify({ email, loggedIn: true }));
      localStorage.setItem("meettools_token", "mock_jwt_token_12345");
      setLoading(false);
      window.location.href = "/dashboard";
    }, 1500);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fff3ec] text-[#121212] font-sans">
      <Navbar />

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-white rounded-3xl p-8 border border-[#fb8500]/20 shadow-xl shadow-[#fb8500]/5">
          
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-[#121212] mb-2">Welcome Back</h1>
            <p className="text-sm text-[#555555]">Sign in to access your image processing dashboard</p>
          </div>

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

          <form onSubmit={handleSubmit} className="space-y-5">
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
                  className="w-full pl-12 pr-4 py-3.5 bg-[#fff3ec]/50 border border-[#fb8500]/20 rounded-2xl text-sm focus:outline-none focus:border-[#fb8500] focus:bg-white transition-all text-[#121212] placeholder-[#888888]"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-[#333333] uppercase tracking-wider">
                  Password
                </label>
                <Link href="#" className="text-xs font-bold text-[#fb8500] hover:underline">
                  Forgot Password?
                </Link>
              </div>
              <div className="relative flex items-center">
                <LockSimpleIcon size={20} className="absolute left-4 text-[#fb8500]" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-12 py-3.5 bg-[#fff3ec]/50 border border-[#fb8500]/20 rounded-2xl text-sm focus:outline-none focus:border-[#fb8500] focus:bg-white transition-all text-[#121212] placeholder-[#888888]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 text-[#888888] hover:text-[#fb8500] transition-colors"
                >
                  {showPassword ? <EyeSlashIcon size={20} /> : <EyeIcon size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-[#fb8500] hover:bg-[#e07600] text-white font-bold rounded-2xl transition-all shadow-lg shadow-[#fb8500]/30 flex items-center justify-center gap-2 text-base mt-2"
            >
              {loading ? "Signing In..." : "Sign In"}
              {!loading && <ArrowRightIcon size={20} weight="bold" />}
            </button>
          </form>

          <p className="text-center text-xs text-[#777777] mt-8">
            Don't have an account?{" "}
            <Link href="/signup" className="font-bold text-[#fb8500] hover:underline">
              Create One
            </Link>
          </p>

        </div>
      </main>
    </div>
  );
}