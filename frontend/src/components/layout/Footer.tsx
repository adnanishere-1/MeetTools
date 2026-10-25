"use client";

import Link from "next/link";
import { 
  ImageSquareIcon, 
  EnvelopeSimpleIcon, 
  ArrowRightIcon, 
  GithubLogoIcon, 
  TwitterLogoIcon, 
  LinkedinLogoIcon,
  HeartIcon
} from "@phosphor-icons/react/dist/ssr";
import { useState } from "react";

export default function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail("");
      setTimeout(() => setSubscribed(false), 3000);
    }
  };

  return (
    <footer className="bg-white border-t border-[#fb8500]/20 text-[#121212] font-sans">
      <div className="max-w-7xl mx-auto px-6 py-10">
        
        {/* Compact Grid Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pb-8 border-b border-[#fb8500]/10">
          
          {/* Brand Overview & Description */}
          <div className="lg:col-span-2 space-y-3">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <div className="p-2 bg-[#fb8500] text-white rounded-xl shadow-md">
                <ImageSquareIcon size={20} weight="duotone" />
              </div>
              <span className="text-xl font-black tracking-tight text-[#121212]">
                Meet<span className="text-[#fb8500]">Tools</span>
              </span>
            </Link>
            
            <p className="text-xs text-[#555555] leading-relaxed max-w-sm">
              The next-generation cloud media platform designed for high-performance image processing, automated scaling, and precision batch optimization.
            </p>

            {/* Compact Newsletter */}
            <div className="pt-1">
              {subscribed ? (
                <div className="p-2 bg-[#fb8500]/10 border border-[#fb8500]/30 text-[#fb8500] rounded-xl text-xs font-bold text-center max-w-sm">
                  🎉 Thank you for subscribing!
                </div>
              ) : (
                <form onSubmit={handleSubscribe} className="flex items-center gap-2 max-w-sm">
                  <div className="relative flex-1">
                    <EnvelopeSimpleIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#fb8500]" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="w-full pl-9 pr-3 py-2 bg-[#fff3ec]/50 border border-[#fb8500]/20 rounded-xl text-xs focus:outline-none focus:border-[#fb8500] text-[#121212] placeholder-[#888888]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="p-2 bg-[#fb8500] hover:bg-[#e07600] text-white rounded-xl transition-all shadow-md shadow-[#fb8500]/20 shrink-0"
                  >
                    <ArrowRightIcon size={16} weight="bold" />
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Navigation Links */}
          <div>
            <h4 className="text-xs font-bold text-[#121212] uppercase tracking-wider mb-3">
              Navigation
            </h4>
            <ul className="space-y-2 text-xs font-semibold text-[#555555]">
              <li><Link href="/" className="hover:text-[#fb8500] transition-colors">Home</Link></li>
              <li><Link href="/dashboard" className="hover:text-[#fb8500] transition-colors">Dashboard</Link></li>
              <li><Link href="/tools" className="hover:text-[#fb8500] transition-colors">Tools Suite</Link></li>
              <li><Link href="/tools/resize" className="hover:text-[#fb8500] transition-colors">Image Resizer</Link></li>
            </ul>
          </div>

          {/* Socials & Connect */}
          <div>
            <h4 className="text-xs font-bold text-[#121212] uppercase tracking-wider mb-3">
              Socials
            </h4>
            <div className="flex items-center gap-2.5 mb-3">
              <a href="#" className="p-2 bg-[#fff3ec] border border-[#fb8500]/20 rounded-xl text-[#fb8500] hover:bg-[#fb8500] hover:text-white transition-all">
                <GithubLogoIcon size={18} />
              </a>
              <a href="#" className="p-2 bg-[#fff3ec] border border-[#fb8500]/20 rounded-xl text-[#fb8500] hover:bg-[#fb8500] hover:text-white transition-all">
                <TwitterLogoIcon size={18} />
              </a>
              <a href="#" className="p-2 bg-[#fff3ec] border border-[#fb8500]/20 rounded-xl text-[#fb8500] hover:bg-[#fb8500] hover:text-white transition-all">
                <LinkedinLogoIcon size={18} />
              </a>
            </div>
            <p className="text-[11px] text-[#777777] leading-relaxed">
              Ultra-fast workflow integration.
            </p>
          </div>

        </div>

        {/* Bottom Bar Section */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-semibold text-[#777777]">
          <p>© {new Date().getFullYear()} MeetTools SaaS. All rights reserved.</p>
          
          <div className="flex items-center gap-1">
            <span>Built with</span>
            <HeartIcon size={13} weight="fill" className="text-[#fb8500]" />
            <span>by MeetTools Team</span>
          </div>
        </div>

      </div>
    </footer>
  );
}