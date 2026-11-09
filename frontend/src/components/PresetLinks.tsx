import Link from "next/link";

import { resizePresets } from "@/lib/resizePresets";

export default function PresetLinks({
  currentSlug,
}: {
  currentSlug?: string;
}) {
  const items = resizePresets.filter((item) => item.slug !== currentSlug);

  if (items.length === 0) return null;

  return (
    <section className="w-full bg-[#fff3ec] font-sans text-[#121212] pb-16 px-6">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-black mb-4">
          More Resize Presets
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {items.map((item) => (
            <Link
              key={item.slug}
              href={`/tools/resize/${item.slug}`}
              className="bg-white rounded-2xl border-2 border-[#fb8500]/20 hover:border-[#fb8500] p-4 text-sm font-bold transition-all"
            >
              {item.h1}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
