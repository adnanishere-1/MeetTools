
"use client";

export interface EnhancementSettings {
  scale: 2 | 4;
  format: "original" | "jpeg" | "png" | "webp";
  quality: number;
}

interface EnhancementEditorProps {
  settings: EnhancementSettings;
  onSettingsChange: (settings: Partial<EnhancementSettings>) => void;
  disabled?: boolean;
}

export default function EnhancementEditor({
  settings,
  onSettingsChange,
  disabled = false,
}: EnhancementEditorProps) {
  const updateSetting = <K extends keyof EnhancementSettings>(
    key: K,
    value: EnhancementSettings[K]
  ) => {
    onSettingsChange({ [key]: value });
  };

  return (
    <div className="space-y-6 text-[#121212]">
      {/* Enhancement scale */}
      <div className="space-y-3">
        <div>
          <label className="text-sm font-semibold text-[#121212]">
            Enhancement scale
          </label>

          <p className="mt-1 text-xs text-[#555555]">
            Choose how much you want to enlarge your image.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {([2, 4] as const).map((scale) => {
            const isSelected = settings.scale === scale;

            return (
              <button
                key={scale}
                type="button"
                disabled={disabled}
                aria-pressed={isSelected}
                onClick={() => updateSetting("scale", scale)}
                className={`rounded-xl border p-4 text-left transition-all ${
                  isSelected
                    ? "border-[#fb8500] bg-[#fff3ec] ring-1 ring-[#fb8500]"
                    : "border-[#e8ded2] bg-white hover:border-[#fb8500]/60 hover:bg-[#fffaf6]"
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                <span
                  className={`block text-lg font-bold ${
                    isSelected
                      ? "text-[#fb8500]"
                      : "text-[#121212]"
                  }`}
                >
                  {scale}x
                </span>

                <span className="mt-1 block text-xs text-[#555555]">
                  {scale === 2
                    ? "Double image dimensions"
                    : "Four times image dimensions"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Output format */}
      <div className="space-y-2">
        <label
          htmlFor="enhancement-format"
          className="text-sm font-semibold text-[#121212]"
        >
          Output format
        </label>

        <select
          id="enhancement-format"
          value={settings.format}
          disabled={disabled}
          onChange={(event) =>
            updateSetting(
              "format",
              event.target.value as EnhancementSettings["format"]
            )
          }
          className="h-11 w-full rounded-xl border border-[#e8ded2] bg-white px-3 text-sm text-[#121212] outline-none transition focus:border-[#fb8500] focus:ring-2 focus:ring-[#fb8500]/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="original">Original format</option>
          <option value="jpeg">JPEG</option>
          <option value="png">PNG</option>
          <option value="webp">WebP</option>
        </select>
      </div>

      {/* Image quality */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label
            htmlFor="enhancement-quality"
            className="text-sm font-semibold text-[#121212]"
          >
            Output quality
          </label>

          <span className="text-sm font-semibold tabular-nums text-[#fb8500]">
            {settings.quality}%
          </span>
        </div>

        <input
          id="enhancement-quality"
          type="range"
          min={50}
          max={100}
          step={5}
          value={settings.quality}
          disabled={disabled}
          onChange={(event) =>
            updateSetting(
              "quality",
              Number(event.target.value)
            )
          }
          className="w-full cursor-pointer accent-[#fb8500] disabled:cursor-not-allowed"
        />

        <div className="flex justify-between text-xs text-[#555555]">
          <span>Smaller file</span>
          <span>Higher quality</span>
        </div>
      </div>

      {/* Information */}
      <p className="rounded-xl border border-[#fb8500]/15 bg-[#fff3ec] p-3 text-xs leading-5 text-[#555555]">
        Higher enhancement scales and quality settings may increase
        processing time and output file size.
      </p>
    </div>
  );
}
