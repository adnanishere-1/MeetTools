"use client";

import Link from "next/link";
import { ListIcon, X, UserCircleIcon, SignOutIcon, CrownIcon } from "@phosphor-icons/react/dist/ssr";
import { useState, useEffect } from "react";
import axios from "axios";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserSession = async () => {
      try {
        const token = localStorage.getItem("meettools_token") || localStorage.getItem("token");
        if (!token) {
          setLoading(false);
          return;
        }

        const response = await axios.get("/api/v1/users/me", {
          headers: { Authorization: `Bearer ${token}` }
        });

        setUser(response.data?.user || response.data);
      } catch (error) {
        console.error("Session check failed:", error);
        localStorage.removeItem("meettools_token");
        localStorage.removeItem("token");
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUserSession();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("meettools_token");
    localStorage.removeItem("token");
    setUser(null);
    window.location.href = "/";
  };

  const isAdmin = user?.role === "admin";

  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-[#fb8500]/20 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        
        {/* Continuous Rotating Processing Badge + Brand Logo */}
        <Link href={isAdmin ? "/admin/dashboard" : "/"} className="flex items-center gap-3 group">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 220 46" 
            width="200" 
            height="42" 
            className="overflow-visible"
          >
            <style>
              {`
                @keyframes spinRing {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
                @keyframes pulseGlow {
                  0% { opacity: 0.3; transform: scale(0.95); }
                  50% { opacity: 0.8; transform: scale(1.05); }
                  100% { opacity: 0.3; transform: scale(0.95); }
                }
                .rotating-ring {
                  animation: spinRing 4s linear infinite;
                  transform-origin: 20px 20px;
                }
                .pulse-bg {
                  animation: pulseGlow 2.5s ease-in-out infinite;
                  transform-origin: 20px 20px;
                }
              `}
            </style>

            <defs>
              <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FB8500" />
                <stop offset="50%" stopColor="#FFB703" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#FB8500" />
              </linearGradient>

              <filter id="darkShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#121212" floodOpacity="0.3" />
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#FB8500" floodOpacity="0.4" />
              </filter>
            </defs>

            <g transform="translate(3, 3)">
              <circle cx="20" cy="20" r="19" fill="#FB8500" opacity="0.25" className="pulse-bg" />
              <circle cx="20" cy="20" r="17" fill="#121212" filter="url(#darkShadow)" />
              <circle 
                cx="20" 
                cy="20" 
                r="15" 
                fill="none" 
                stroke="url(#ringGradient)" 
                strokeWidth="2.5" 
                strokeDasharray="60 30" 
                strokeLinecap="round" 
                className="rotating-ring" 
              />
              <text 
                x="20" 
                y="25" 
                fontFamily="system-ui, -apple-system, sans-serif" 
                fontSize="12" 
                fontWeight="900" 
                fill="#FFFFFF" 
                textAnchor="middle"
              >
                MT
              </text>
            </g>

            <text 
              x="52" 
              y="28" 
              fontFamily="system-ui, -apple-system, sans-serif" 
              fontSize="22" 
              fontWeight="900" 
              fill="#121212" 
              letterSpacing="-0.7"
            >
              Meet<tspan fill="#FB8500">Tools</tspan>
            </text>
          </svg>
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8">
          {isAdmin ? (
            // Admin ke liye Home aur Tools hide, sirf Admin Dashboard
            <Link href="/admin/dashboard" className="text-sm font-bold text-[#fb8500] flex items-center gap-1.5">
              <CrownIcon size={18} weight="fill" /> Admin Control Panel
            </Link>
          ) : (
            // Normal Users ke liye
            <>
              <Link href="/" className="text-sm font-semibold text-[#333333] hover:text-[#fb8500] transition-colors">
                Home
              </Link>
              <Link href="/tools" className="text-sm font-semibold text-[#333333] hover:text-[#fb8500] transition-colors">
                Tools
              </Link>
              {!loading && user && (
                <Link href="/dashboard" className="text-sm font-semibold text-[#333333] hover:text-[#fb8500] transition-colors">
                  Dashboard
                </Link>
              )}
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="hidden md:flex items-center gap-4">
          {!loading && user ? (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm font-bold text-[#121212]">
                <UserCircleIcon size={24} className="text-[#fb8500]" weight="fill" />
                <span>{user.name || "Account"}</span>
                {isAdmin && (
                  <span className="px-2 py-0.5 bg-[#fb8500]/10 text-[#fb8500] border border-[#fb8500]/30 rounded-full text-[10px] uppercase font-black">
                    Admin
                  </span>
                )}
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-xl transition-colors flex items-center gap-1 border border-red-200 cursor-pointer"
              >
                <SignOutIcon size={16} /> Logout
              </button>
            </div>
          ) : !loading && (
            <>
              <Link href="/login" className="px-5 py-2.5 text-sm font-bold text-[#333333] hover:text-[#fb8500] transition-colors">
                Sign In
              </Link>
              <Link href="/signup" className="px-5 py-2.5 text-sm font-bold text-white bg-[#fb8500] hover:bg-[#e07600] rounded-xl transition-all shadow-lg shadow-[#fb8500]/30">
                Get Started
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button onClick={() => setIsOpen(!isOpen)} className="md:hidden p-2 text-[#333333] focus:outline-none cursor-pointer">
          {isOpen ? <X size={26} /> : <ListIcon size={26} />}
        </button>
      </div>

      {/* Mobile Dropdown */}
      {isOpen && (
        <div className="md:hidden bg-white border-b border-[#fb8500]/20 px-6 py-6 flex flex-col gap-4 shadow-xl">
          {isAdmin ? (
            <Link href="/admin/dashboard" onClick={() => setIsOpen(false)} className="text-base font-bold text-[#fb8500] flex items-center gap-2">
              <CrownIcon size={18} weight="fill" /> Admin Control Panel
            </Link>
          ) : (
            <>
              <Link href="/" onClick={() => setIsOpen(false)} className="text-base font-semibold text-[#333333]">Home</Link>
              <Link href="/tools" onClick={() => setIsOpen(false)} className="text-base font-semibold text-[#333333]">Tools</Link>
              {!loading && user && (
                <Link href="/dashboard" onClick={() => setIsOpen(false)} className="text-base font-semibold text-[#333333]">Dashboard</Link>
              )}
            </>
          )}
          
          <div className="flex flex-col gap-3 pt-4 border-t border-[#fb8500]/10">
            {!loading && user ? (
              <button onClick={handleLogout} className="text-center py-2.5 text-sm font-bold text-red-500 bg-red-50 rounded-xl border border-red-200">
                Logout
              </button>
            ) : !loading && (
              <>
                <Link href="/login" onClick={() => setIsOpen(false)} className="text-center py-2 text-sm font-bold text-[#333333]">Sign In</Link>
                <Link href="/signup" onClick={() => setIsOpen(false)} className="text-center py-3 text-sm font-bold text-white bg-[#fb8500] rounded-xl shadow-md">Get Started</Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}