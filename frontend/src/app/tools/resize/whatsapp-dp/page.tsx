import type { Metadata } from "next";

import PresetResizePage from "@/components/tools/PresetResizePage";
import { getPreset } from "@/lib/resizePresets";

const preset = getPreset("whatsapp-dp");

export const metadata: Metadata = {
  title: preset.metaTitle,
  description: preset.metaDescription,
  alternates: { canonical: `/tools/resize/${preset.slug}` },
};

export default function Page() {
  return <PresetResizePage preset={preset} />;
}
