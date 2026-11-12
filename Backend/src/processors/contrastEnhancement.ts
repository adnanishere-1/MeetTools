
import sharp from "sharp";

const MAX_IMAGE_PIXELS = 40_000_000;
const ANALYSIS_SIZE = 256;

const DEFAULT_TARGET_CONTRAST = 48;
const DEFAULT_MAX_CONTRAST = 1.35;

const MIN_CONTRAST = 0.5;
const MAX_CONTRAST = 2;

const SUPPORTED_FORMATS = new Set([
  "jpeg",
  "png",
  "webp",
  "tiff",
]);

export interface ContrastEnhancementOptions {
  contrast?: number;
  auto?: boolean;
  targetContrast?: number;
  maxContrast?: number;
  protectHighlights?: boolean;
  protectShadows?: boolean;
}

export interface ContrastEnhancementResult {
  buffer: Buffer;
  adjustment: {
    contrast: number;
    automatic: boolean;
  };
  analysis: {
    originalContrast: number;
    estimatedContrast: number;
    brightness: number;
    shadowClippingPercentage: number;
    highlightClippingPercentage: number;
  };
}

export class ContrastEnhancementError extends Error {
  public readonly code: string;

  constructor(
    message: string,
    code = "CONTRAST_ENHANCEMENT_FAILED",
  ) {
    super(message);
    this.name = "ContrastEnhancementError";
    this.code = code;
  }
}

interface ContrastAnalysis {
  brightness: number;
  contrast: number;
  shadowClippingPercentage: number;
  highlightClippingPercentage: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function round(value: number, decimals = 3): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

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

async function analyzeContrast(
  input: Buffer,
): Promise<ContrastAnalysis> {
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
    throw new ContrastEnhancementError(
      "Unable to read image pixel data.",
      "INVALID_PIXEL_DATA",
    );
  }

  const pixelCount = info.width * info.height;

  let luminanceSum = 0;
  let luminanceSquaredSum = 0;
  let shadowClippedPixels = 0;
  let highlightClippedPixels = 0;

  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3] / 255;

    const red = data[i] * alpha + 255 * (1 - alpha);
    const green = data[i + 1] * alpha + 255 * (1 - alpha);
    const blue = data[i + 2] * alpha + 255 * (1 - alpha);

    const luminance = getLuminance(red, green, blue);

    luminanceSum += luminance;
    luminanceSquaredSum += luminance * luminance;

    if (luminance <= 5) shadowClippedPixels++;
    if (luminance >= 250) highlightClippedPixels++;
  }

  const brightness = luminanceSum / pixelCount;

  const variance = Math.max(
    0,
    luminanceSquaredSum / pixelCount -
      brightness * brightness,
  );

  return {
    brightness,
    contrast: Math.sqrt(variance),
    shadowClippingPercentage:
      (shadowClippedPixels / pixelCount) * 100,
    highlightClippingPercentage:
      (highlightClippedPixels / pixelCount) * 100,
  };
}

function calculateAutomaticContrast(
  analysis: ContrastAnalysis,
  targetContrast: number,
  maxContrast: number,
  protectHighlights: boolean,
  protectShadows: boolean,
): number {
  const currentContrast = analysis.contrast;

  if (currentContrast < 1) return 1;

  if (Math.abs(targetContrast - currentContrast) < 5) {
    return 1;
  }

  let multiplier = targetContrast / currentContrast;

  multiplier = clamp(
    multiplier,
    1 / maxContrast,
    maxContrast,
  );

  if (multiplier > 1 && protectHighlights) {
    if (analysis.highlightClippingPercentage > 30) {
      multiplier = 1 + (multiplier - 1) * 0.2;
    } else if (analysis.highlightClippingPercentage > 15) {
      multiplier = 1 + (multiplier - 1) * 0.5;
    }
  }

  if (multiplier > 1 && protectShadows) {
    if (analysis.shadowClippingPercentage > 30) {
      multiplier = 1 + (multiplier - 1) * 0.2;
    } else if (analysis.shadowClippingPercentage > 15) {
      multiplier = 1 + (multiplier - 1) * 0.5;
    }
  }

  return clamp(multiplier, 1 / maxContrast, maxContrast);
}

/**
 * Applies contrast to RGB pixels while preserving alpha.
 * The corrected intermediate image is encoded as PNG.
 */
async function applyContrast(
  input: Buffer,
  multiplier: number,
): Promise<Buffer> {
  const { data, info } = await sharp(input, {
    failOn: "error",
    limitInputPixels: MAX_IMAGE_PIXELS,
    sequentialRead: true,
  })
    .rotate()
    .toColourspace("srgb")
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  if (
    info.channels !== 4 ||
    info.width <= 0 ||
    info.height <= 0
  ) {
    throw new ContrastEnhancementError(
      "Unable to prepare image pixels for contrast adjustment.",
      "INVALID_PIXEL_DATA",
    );
  }

  const offset = 128 * (1 - multiplier);

  for (let i = 0; i < data.length; i += 4) {
    data[i] = clamp(
      Math.round(data[i] * multiplier + offset),
      0,
      255,
    );

    data[i + 1] = clamp(
      Math.round(data[i + 1] * multiplier + offset),
      0,
      255,
    );

    data[i + 2] = clamp(
      Math.round(data[i + 2] * multiplier + offset),
      0,
      255,
    );

    // Alpha channel is intentionally unchanged.
  }

  return sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4,
    },
  })
    .png()
    .toBuffer();
}

export async function enhanceContrast(
  input: Buffer,
  options: ContrastEnhancementOptions = {},
): Promise<ContrastEnhancementResult> {
  try {
    if (!Buffer.isBuffer(input) || input.length === 0) {
      throw new ContrastEnhancementError(
        "A valid non-empty image Buffer is required.",
        "INVALID_INPUT",
      );
    }

    const {
      contrast,
      auto = true,
      targetContrast = DEFAULT_TARGET_CONTRAST,
      maxContrast = DEFAULT_MAX_CONTRAST,
      protectHighlights = true,
      protectShadows = true,
    } = options;

    if (
      contrast !== undefined &&
      (!Number.isFinite(contrast) ||
        contrast < MIN_CONTRAST ||
        contrast > MAX_CONTRAST)
    ) {
      throw new ContrastEnhancementError(
        "Contrast must be between 0.5 and 2.",
        "INVALID_CONTRAST",
      );
    }

    if (
      !Number.isFinite(targetContrast) ||
      targetContrast < 15 ||
      targetContrast > 90
    ) {
      throw new ContrastEnhancementError(
        "Target contrast must be between 15 and 90.",
        "INVALID_TARGET_CONTRAST",
      );
    }

    if (
      !Number.isFinite(maxContrast) ||
      maxContrast < 1 ||
      maxContrast > MAX_CONTRAST
    ) {
      throw new ContrastEnhancementError(
        "Maximum contrast must be between 1 and 2.",
        "INVALID_MAX_CONTRAST",
      );
    }

    const metadata = await sharp(input, {
      failOn: "error",
      limitInputPixels: MAX_IMAGE_PIXELS,
    }).metadata();

    if (
      !metadata.width ||
      !metadata.height ||
      !metadata.format
    ) {
      throw new ContrastEnhancementError(
        "Image metadata is invalid.",
        "INVALID_IMAGE",
      );
    }

    if (!SUPPORTED_FORMATS.has(metadata.format)) {
      throw new ContrastEnhancementError(
        "Unsupported image format.",
        "UNSUPPORTED_FORMAT",
      );
    }

    const totalPixels = metadata.width * metadata.height;

    if (
      !Number.isSafeInteger(totalPixels) ||
      totalPixels > MAX_IMAGE_PIXELS
    ) {
      throw new ContrastEnhancementError(
        "Image exceeds the maximum allowed pixel count.",
        "IMAGE_TOO_LARGE",
      );
    }

    const analysis = await analyzeContrast(input);

    const automatic = contrast === undefined && auto;

    let multiplier = 1;

    if (contrast !== undefined) {
      multiplier = contrast;
    } else if (auto) {
      multiplier = calculateAutomaticContrast(
        analysis,
        targetContrast,
        maxContrast,
        protectHighlights,
        protectShadows,
      );
    }

    multiplier = clamp(
      multiplier,
      MIN_CONTRAST,
      MAX_CONTRAST,
    );

    const resultAnalysis = {
      originalContrast: round(analysis.contrast),
      estimatedContrast: round(analysis.contrast * multiplier),
      brightness: round(analysis.brightness),
      shadowClippingPercentage: round(
        analysis.shadowClippingPercentage,
      ),
      highlightClippingPercentage: round(
        analysis.highlightClippingPercentage,
      ),
    };

    if (Math.abs(multiplier - 1) < 0.001) {
      return {
        buffer: input,
        adjustment: {
          contrast: 1,
          automatic,
        },
        analysis: {
          ...resultAnalysis,
          estimatedContrast: resultAnalysis.originalContrast,
        },
      };
    }

    const correctedBuffer = await applyContrast(
      input,
      multiplier,
    );

    return {
      buffer: correctedBuffer,
      adjustment: {
        contrast: round(multiplier),
        automatic,
      },
      analysis: resultAnalysis,
    };
  } catch (error) {
    if (error instanceof ContrastEnhancementError) {
      throw error;
    }

    const reason =
      error instanceof Error ? error.message : String(error);

    throw new ContrastEnhancementError(
      `Unable to enhance image contrast: ${reason}`,
    );
  }
}
