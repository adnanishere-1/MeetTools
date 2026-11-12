
import sharp from "sharp";

export interface ExposureCorrectionOptions {
  exposure?: number;
  auto?: boolean;
  targetBrightness?: number;
  maxAutoExposure?: number;
  protectHighlights?: boolean;
  protectShadows?: boolean;
}

export interface ExposureCorrectionResult {
  buffer: Buffer;

  adjustment: {
    exposureStops: number;
    brightnessMultiplier: number;
    automatic: boolean;
  };

  analysis: {
    originalBrightness: number;
    estimatedBrightness: number;
  };
}

export class ExposureCorrectionError extends Error {
  public readonly code: string;

  constructor(
    message: string,
    code = "EXPOSURE_CORRECTION_FAILED",
  ) {
    super(message);
    this.name = "ExposureCorrectionError";
    this.code = code;
  }
}

const MAX_IMAGE_PIXELS = 40_000_000;
const ANALYSIS_SIZE = 256;

const DEFAULT_TARGET_BRIGHTNESS = 140;
const DEFAULT_MAX_AUTO_EXPOSURE = 1;

const MIN_EXPOSURE = -2;
const MAX_EXPOSURE = 2;

const clamp = (
  value: number,
  min: number,
  max: number,
): number => Math.min(Math.max(value, min), max);

const round = (value: number, decimals = 3): number => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

function getLuminance(
  red: number,
  green: number,
  blue: number,
): number {
  return (
    red * 0.2126 +
    green * 0.7152 +
    blue * 0.0722
  );
}

async function analyzeBrightness(
  input: Buffer,
): Promise<{
  brightness: number;
  darkPercentage: number;
  brightPercentage: number;
}> {
  const { data, info } = await sharp(input, {
    failOn: "error",
    limitInputPixels: MAX_IMAGE_PIXELS,
    sequentialRead: true,
  })
    .rotate()
    .toColourspace("srgb")
    .resize({
      width: ANALYSIS_SIZE,
      height: ANALYSIS_SIZE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  if (
    info.channels !== 4 ||
    info.width <= 0 ||
    info.height <= 0
  ) {
    throw new ExposureCorrectionError(
      "Unable to analyze image pixels.",
      "INVALID_PIXEL_DATA",
    );
  }

  const pixelCount = info.width * info.height;

  let brightnessSum = 0;
  let darkPixels = 0;
  let brightPixels = 0;

  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3] / 255;

    const red = data[i] * alpha + 255 * (1 - alpha);
    const green = data[i + 1] * alpha + 255 * (1 - alpha);
    const blue = data[i + 2] * alpha + 255 * (1 - alpha);

    const luminance = getLuminance(red, green, blue);

    brightnessSum += luminance;

    if (luminance < 30) darkPixels++;
    if (luminance > 225) brightPixels++;
  }

  return {
    brightness: brightnessSum / pixelCount,
    darkPercentage: (darkPixels / pixelCount) * 100,
    brightPercentage: (brightPixels / pixelCount) * 100,
  };
}

/**
 * Calculate a conservative automatic exposure adjustment.
 */
function calculateAutomaticExposure(
  analysis: Awaited<ReturnType<typeof analyzeBrightness>>,
  targetBrightness: number,
  maxAutoExposure: number,
  protectHighlights: boolean,
  protectShadows: boolean,
): number {
  const brightness = analysis.brightness;

  if (Math.abs(targetBrightness - brightness) < 5) {
    return 0;
  }

  const safeBrightness = Math.max(brightness, 1);

  // Use a gentler logarithmic adjustment to avoid
  // making already usable images look artificially bright.
  let stops = Math.log2(targetBrightness / safeBrightness);

  if (stops > 0 && protectHighlights) {
    if (analysis.brightPercentage > 35) {
      stops *= 0.25;
    } else if (analysis.brightPercentage > 15) {
      stops *= 0.5;
    }
  }

  if (stops < 0 && protectShadows) {
    if (analysis.darkPercentage > 35) {
      stops *= 0.5;
    } else if (analysis.darkPercentage > 15) {
      stops *= 0.75;
    }
  }

  return clamp(stops, -maxAutoExposure, maxAutoExposure);
}

/**
 * Correct image exposure while preserving image metadata
 * and transparency.
 */
export async function correctExposure(
  input: Buffer,
  options: ExposureCorrectionOptions = {},
): Promise<ExposureCorrectionResult> {
  try {
    if (!Buffer.isBuffer(input) || input.length === 0) {
      throw new ExposureCorrectionError(
        "A valid non-empty image Buffer is required.",
        "INVALID_INPUT",
      );
    }

    const {
      exposure,
      auto = true,
      targetBrightness = DEFAULT_TARGET_BRIGHTNESS,
      maxAutoExposure = DEFAULT_MAX_AUTO_EXPOSURE,
      protectHighlights = true,
      protectShadows = true,
    } = options;

    if (
      exposure !== undefined &&
      (!Number.isFinite(exposure) ||
        exposure < MIN_EXPOSURE ||
        exposure > MAX_EXPOSURE)
    ) {
      throw new ExposureCorrectionError(
        "Exposure must be between -2 and +2 stops.",
        "INVALID_EXPOSURE",
      );
    }

    if (
      !Number.isFinite(targetBrightness) ||
      targetBrightness < 30 ||
      targetBrightness > 220
    ) {
      throw new ExposureCorrectionError(
        "Target brightness must be between 30 and 220.",
        "INVALID_TARGET_BRIGHTNESS",
      );
    }

    if (
      !Number.isFinite(maxAutoExposure) ||
      maxAutoExposure < 0 ||
      maxAutoExposure > 1.5
    ) {
      throw new ExposureCorrectionError(
        "Maximum automatic exposure must be between 0 and 1.5 stops.",
        "INVALID_MAX_AUTO_EXPOSURE",
      );
    }

    const metadata = await sharp(input, {
      failOn: "error",
      limitInputPixels: MAX_IMAGE_PIXELS,
    }).metadata();

    if (!metadata.width || !metadata.height || !metadata.format) {
      throw new ExposureCorrectionError(
        "Invalid or unsupported image.",
        "INVALID_IMAGE",
      );
    }

    if (
      !["jpeg", "png", "webp", "tiff"].includes(metadata.format)
    ) {
      throw new ExposureCorrectionError(
        "Unsupported image format.",
        "UNSUPPORTED_FORMAT",
      );
    }

    const analysis = await analyzeBrightness(input);

    const automatic = exposure === undefined && auto;

    let exposureStops = 0;

    if (exposure !== undefined) {
      exposureStops = exposure;
    } else if (auto) {
      exposureStops = calculateAutomaticExposure(
        analysis,
        targetBrightness,
        maxAutoExposure,
        protectHighlights,
        protectShadows,
      );
    }

    exposureStops = clamp(
      exposureStops,
      MIN_EXPOSURE,
      MAX_EXPOSURE,
    );

    const brightnessMultiplier = 2 ** exposureStops;

    if (Math.abs(exposureStops) < 0.001) {
      return {
        buffer: input,
        adjustment: {
          exposureStops: 0,
          brightnessMultiplier: 1,
          automatic,
        },
        analysis: {
          originalBrightness: round(analysis.brightness),
          estimatedBrightness: round(analysis.brightness),
        },
      };
    }

    // Linear exposure adjustment. Alpha is not modified.
    const correctedBuffer = await sharp(input, {
      failOn: "error",
      limitInputPixels: MAX_IMAGE_PIXELS,
      sequentialRead: true,
    })
      .linear(brightnessMultiplier, 0)
      .toBuffer();

    const estimatedBrightness = clamp(
      analysis.brightness * brightnessMultiplier,
      0,
      255,
    );

    return {
      buffer: correctedBuffer,
      adjustment: {
        exposureStops: round(exposureStops),
        brightnessMultiplier: round(brightnessMultiplier),
        automatic,
      },
      analysis: {
        originalBrightness: round(analysis.brightness),
        estimatedBrightness: round(estimatedBrightness),
      },
    };
  } catch (error) {
    if (error instanceof ExposureCorrectionError) {
      throw error;
    }

    throw new ExposureCorrectionError(
      error instanceof Error
        ? `Unable to correct image exposure: ${error.message}`
        : "Unable to correct image exposure.",
    );
  }
}
