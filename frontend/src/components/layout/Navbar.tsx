"use client";

import Link from "next/link";
import { ImageSquareIcon, ListIcon, X, UserCircleIcon, SignOutIcon } from "@phosphor-icons/react/dist/ssr";
import { useState, useEffect } from "react";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const user = localStorage.getItem("meettools_user");
    if (user) {
      setIsLoggedIn(true);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("meettools_user");
    localStorage.removeItem("meettools_token");
    setIsLoggedIn(false);
    window.location.href = "/";
  };

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
          <Link href="/tools" className="text-sm font-semibold text-[#333333] hover:text-[#fb8500] transition-colors">
            Tools
          </Link>
          {isLoggedIn && (
            <Link href="/dashboard" className="text-sm font-semibold text-[#333333] hover:text-[#fb8500] transition-colors">
              Dashboard
            </Link>
          )}
        </div>

        {/* Action Buttons */}
        <div className="hidden md:flex items-center gap-4">
          {isLoggedIn ? (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm font-bold text-[#121212]">
                <UserCircleIcon size={24} className="text-[#fb8500]" weight="fill" />
                <span>My Account</span>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-xl transition-colors flex items-center gap-1 border border-red-200"
              >
                <SignOutIcon size={16} /> Logout
              </button>
            </div>
          ) : (
            <>
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
            </>
          )}
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
          <Link href="/tools" onClick={() => setIsOpen(false)} className="text-base font-semibold text-[#333333]">
            Tools
          </Link>
          {isLoggedIn && (
            <Link href="/dashboard" onClick={() => setIsOpen(false)} className="text-base font-semibold text-[#333333]">
              Dashboard
            </Link>
          )}
          
          <div className="flex flex-col gap-3 pt-4 border-t border-[#fb8500]/10">
            {isLoggedIn ? (
              <button
                onClick={handleLogout}
                className="text-center py-2.5 text-sm font-bold text-red-500 bg-red-50 rounded-xl"
              >
                Logout
              </button>
            ) : (
              <>
                <Link href="/login" onClick={() => setIsOpen(false)} className="text-center py-2 text-sm font-bold text-[#333333]">
                  Sign In
                </Link>
                <Link href="/signup" onClick={() => setIsOpen(false)} className="text-center py-3 text-sm font-bold text-white bg-[#fb8500] rounded-xl shadow-md">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}