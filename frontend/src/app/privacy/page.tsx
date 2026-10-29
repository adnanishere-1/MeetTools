
import Navbar from "@/components/layout/Navbar";
import Link from "next/link";

import {
  ArrowLeftIcon,
  ShieldCheckIcon,
} from "@phosphor-icons/react/dist/ssr";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#fff3ec] text-[#121212] font-sans">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto px-6 py-12 w-full">
        {/* Back to Signup */}
        <Link
          href="/signup"
          className="inline-flex items-center gap-2 text-xs font-bold text-[#555555] hover:text-[#fb8500] transition-colors mb-6"
        >
          <ArrowLeftIcon size={16} />
          Back to Sign Up
        </Link>

        {/* Privacy Policy Card */}
        <div className="bg-white rounded-3xl p-8 md:p-12 border border-[#fb8500]/20 shadow-xl shadow-[#fb8500]/5">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-[#fb8500]/10 text-[#fb8500] rounded-2xl border border-[#fb8500]/20">
              <ShieldCheckIcon
                size={28}
                weight="duotone"
              />
            </div>

            <div>
              <h1 className="text-3xl font-black text-[#121212]">
                Privacy Policy
              </h1>

              <p className="text-xs text-[#777777]">
                Last updated: October 2026
              </p>
            </div>
          </div>

          {/* Privacy Policy Content */}
          <div className="space-y-6 text-sm text-[#444444] leading-relaxed border-t border-[#fb8500]/10 pt-6">
            {/* Section 1 */}
            <section>
              <h2 className="text-lg font-bold text-[#121212] mb-2">
                1. Information We Collect
              </h2>

              <p>
                We collect your name, email
                address, and account preferences
                to provide secure authentication
                and manage your personal user
                profile.
              </p>
            </section>

            {/* Section 2 */}
            <section>
              <h2 className="text-lg font-bold text-[#121212] mb-2">
                2. Cookies & Preferences
              </h2>

              <p>
                We utilize essential cookies for
                platform session management.
                Optional analytics and marketing
                cookies are activated strictly
                based on the explicit consent
                choices you make during
                registration.
              </p>
            </section>

            {/* Section 3 */}
            <section>
              <h2 className="text-lg font-bold text-[#121212] mb-2">
                3. Data Security
              </h2>

              <p>
                Your data is stored securely using
                encrypted formats. We do not sell
                or trade your personal information
                to external third parties.
              </p>
            </section>

            {/* Section 4 */}
            <section>
              <h2 className="text-lg font-bold text-[#121212] mb-2">
                4. Your Rights
              </h2>

              <p>
                You retain the right to delete
                your account or clear your saved
                dashboard assets at any time
                through your account settings.
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
