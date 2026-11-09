import { Suspense } from "react";

import ImageResizeTool from "@/components/tools/ImageResizeTool";
import FaqSection from "@/components/FaqSection";
import PresetLinks from "@/components/PresetLinks";
import type { ResizePreset } from "@/lib/resizePresets";

export default function PresetResizePage({
  preset,
}: {
  preset: ResizePreset;
}) {
  return (
    <Suspense fallback={null}>
      <ImageResizeTool preset={preset} />

      <section className="w-full bg-[#fff3ec] font-sans text-[#121212] pt-16 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-black mb-4">
            How It Works
          </h2>

          <p className="text-sm md:text-base text-[#555555] leading-relaxed mb-8">
            {preset.intro}
          </p>

          <ol className="space-y-3">
            {preset.steps.map((step, index) => (
              <li
                key={step}
                className="bg-white rounded-2xl border-2 border-[#fb8500]/20 p-5 text-sm text-[#555555] leading-relaxed"
              >
                <span className="font-black text-[#c2410c]">
                  {index + 1}.
                </span>{" "}
                {step}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <FaqSection items={preset.faqs} />

      <PresetLinks currentSlug={preset.slug} />
    </Suspense>
  );
}
