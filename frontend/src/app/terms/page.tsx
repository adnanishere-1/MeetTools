
import Navbar from "@/components/layout/Navbar";
import Link from "next/link";

import {
  ArrowLeftIcon,
  FileTextIcon,
} from "@phosphor-icons/react/dist/ssr";

export default function TermsPage() {
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

        {/* Terms Card */}
        <div className="bg-white rounded-3xl p-8 md:p-12 border border-[#fb8500]/20 shadow-xl shadow-[#fb8500]/5">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-[#fb8500]/10 text-[#fb8500] rounded-2xl border border-[#fb8500]/20">
              <FileTextIcon
                size={28}
                weight="duotone"
              />
            </div>

            <div>
              <h1 className="text-3xl font-black text-[#121212]">
                Terms & Conditions
              </h1>

              <p className="text-xs text-[#777777]">
                Last updated: October 2026
              </p>
            </div>
          </div>

          {/* Terms Content */}
          <div className="space-y-6 text-sm text-[#444444] leading-relaxed border-t border-[#fb8500]/10 pt-6">
            {/* Section 1 */}
            <section>
              <h2 className="text-lg font-bold text-[#121212] mb-2">
                1. Acceptance of Terms
              </h2>

              <p>
                By accessing or using MeetTools,
                you agree to comply with and be
                bound by these Terms & Conditions.
                If you do not agree to these terms,
                please discontinue using our
                services immediately.
              </p>
            </section>

            {/* Section 2 */}
            <section>
              <h2 className="text-lg font-bold text-[#121212] mb-2">
                2. User Account & Assets
              </h2>

              <p>
                Registered users can manage their
                media files and processed outputs
                securely within the Dashboard
                Library. You are solely responsible
                for all uploaded content and
                maintaining the confidentiality
                of your account credentials.
              </p>
            </section>

            {/* Section 3 */}
            <section>
              <h2 className="text-lg font-bold text-[#121212] mb-2">
                3. Acceptable Use
              </h2>

              <p>
                You agree not to upload, transmit,
                or distribute any illegal,
                copyright-infringed, or malicious
                content through the MeetTools
                platform.
              </p>
            </section>

            {/* Section 4 */}
            <section>
              <h2 className="text-lg font-bold text-[#121212] mb-2">
                4. Service Modifications
              </h2>

              <p>
                We reserve the right to modify,
                update, or discontinue any tools,
                features, or services at any time
                without prior notice.
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
