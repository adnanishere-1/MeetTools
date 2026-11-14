
import Link from "next/link";
import { resizePresets } from "@/lib/resizePresets";

interface LinkItem {
  href: string;
  label: string;
}

const otherTools: LinkItem[] = [
  { href: "/tools/enhance", label: "Free Image Enhancer" },
];

export default function PresetLinks({
  currentSlug,
  currentHref,
}: {
  currentSlug?: string;
  currentHref?: string;
}) {
  const activeHref =
    currentHref ??
    (currentSlug ? `/tools/resize/${currentSlug}` : undefined);

  const items: LinkItem[] = [
    ...otherTools,
    ...resizePresets.map((preset) => ({
      href: `/tools/resize/${preset.slug}`,
      label: preset.h1,
    })),
  ].filter((item) => item.href !== activeHref);

  if (items.length === 0) return null;

  return (
    <section
      className="w-full bg-[#fff3ec] font-sans text-[#121212] pb-16 px-6"
      aria-labelledby="related-tools-heading"
    >
      <div className="max-w-3xl mx-auto">
        <h2
          id="related-tools-heading"
          className="text-2xl md:text-3xl font-black mb-4"
        >
          Explore More Free Image Tools
        </h2>

        <p className="text-sm md:text-base text-[#555555] leading-relaxed mb-6">
          Need more than image resizing? Explore other MeetTools utilities
          to improve image quality or resize pictures for specific size
          requirements.
        </p>

        <nav aria-label="Related image tools and resize presets">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="bg-white rounded-2xl border-2 border-[#fb8500]/20 hover:border-[#fb8500] p-4 text-sm font-bold transition-all"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </section>
  );
}
