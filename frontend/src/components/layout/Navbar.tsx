"use client";

import Link from "next/link";
import { ImageSquareIcon, ListIcon, X } from "@phosphor-icons/react/dist/ssr";
import { useState } from "react";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-[#fb8500]/20 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <div className="p-2.5 bg-[#fb8500] text-white rounded-xl shadow-md">
            <ImageSquareIcon size={24} weight="duotone" />
          </div>
          <span className="text-2xl font-black tracking-tight text-[#121212]">
            Meet<span className="text-[#fb8500]">Tools</span>
          </span>
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8">
          <Link href="/" className="text-sm font-semibold text-[#333333] hover:text-[#fb8500] transition-colors">
            Home
          </Link>
          <Link href="/dashboard" className="text-sm font-semibold text-[#333333] hover:text-[#fb8500] transition-colors">
            Dashboard
          </Link>
          <Link href="/presets" className="text-sm font-semibold text-[#333333] hover:text-[#fb8500] transition-colors">
            Presets
          </Link>
        </div>

        {/* Action Buttons (Redirecting correctly) */}
        <div className="hidden md:flex items-center gap-4">
          <Link
            href="/login"
            className="px-5 py-2.5 text-sm font-bold text-[#333333] hover:text-[#fb8500] transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="px-5 py-2.5 text-sm font-bold text-white bg-[#fb8500] hover:bg-[#e07600] rounded-xl transition-all shadow-lg shadow-[#fb8500]/30"
          >
            Get Started
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden p-2 text-[#333333] focus:outline-none"
        >
          {isOpen ? <X size={26} /> : <ListIcon size={26} />}
        </button>
      </div>

      {/* Mobile Dropdown */}
      {isOpen && (
        <div className="md:hidden bg-white border-b border-[#fb8500]/20 px-6 py-6 flex flex-col gap-4 shadow-xl">
          <Link href="/" onClick={() => setIsOpen(false)} className="text-base font-semibold text-[#333333]">
            Home
          </Link>
          <Link href="/dashboard" onClick={() => setIsOpen(false)} className="text-base font-semibold text-[#333333]">
            Dashboard
          </Link>
          <Link href="/presets" onClick={() => setIsOpen(false)} className="text-base font-semibold text-[#333333]">
            Presets
          </Link>
          <div className="flex flex-col gap-3 pt-4 border-t border-[#fb8500]/10">
            <Link href="/login" onClick={() => setIsOpen(false)} className="text-center py-2 text-sm font-bold text-[#333333]">
              Sign In
            </Link>
            <Link href="/signup" onClick={() => setIsOpen(false)} className="text-center py-3 text-sm font-bold text-white bg-[#fb8500] rounded-xl shadow-md">
              Get Started
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}