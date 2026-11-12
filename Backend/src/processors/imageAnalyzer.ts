
import sharp from "sharp";

const MAX_IMAGE_PIXELS = 40_000_000;
const ANALYSIS_SIZE = 256;

const ALLOWED_FORMATS = new Set([
  "jpeg",
  "png",
  "webp",
  "tiff",
]);

export interface ImageAnalyzerInput {
  input: Buffer | string;
}

export type ImageQualityLevel = "low" | "medium" | "high";

export interface ImageAnalysisResult {
  metadata: {
    width: number;
    height: number;
    format: string;
    size: number;
    hasAlpha: boolean;
  };

  metrics: {
    brightness: number;
    contrast: number;
    saturation: number;
    entropy: number;
    sharpness: number;
    darkPixelPercentage: number;
    brightPixelPercentage: number;
    shadowClippingPercentage: number;
    highlightClippingPercentage: number;
  };

  assessment: {
    exposure: ImageQualityLevel;
    contrast: ImageQualityLevel;
    color: ImageQualityLevel;
    sharpness: ImageQualityLevel;
  };

  recommendations: {
    brightness: number;
    contrast: number;
    saturation: number;
    sharpness: number;
    noiseReduction: number;
    autoExposure: boolean;
    autoContrast: boolean;
    autoColorCorrection: boolean;
  };
}

export class ImageAnalyzerError extends Error {
  public readonly code: string;

  constructor(message: string, code = "IMAGE_ANALYSIS_FAILED") {
    super(message);
    this.name = "ImageAnalyzerError";
    this.code = code;
  }
}

interface PixelAnalysis {
  brightness: number;
  contrast: number;
  saturation: number;
  entropy: number;
  sharpness: number;
  darkPixelPercentage: number;
  brightPixelPercentage: number;
  shadowClippingPercentage: number;
  highlightClippingPercentage: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function getQualityLevel(
  value: number,
  lowThreshold: number,
  highThreshold: number,
): ImageQualityLevel {
  if (value < lowThreshold) return "low";
  if (value < highThreshold) return "medium";
  return "high";
}

function getLuminance(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Estimates sharpness using Laplacian variance.
 * This is a heuristic, not a definitive blur detector.
 */
function calculateSharpness(
  grayscale: Uint8Array,
  width: number,
  height: number,
): number {
  if (width < 3 || height < 3) {
    return 0;
  }

  let sum = 0;
  let sumSquared = 0;
  let count = 0;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const index = y * width + x;

      const center = grayscale[index];

      const laplacian =
        grayscale[index - width] +
        grayscale[index + width] +
        grayscale[index - 1] +
        grayscale[index + 1] -
        4 * center;

      sum += laplacian;
      sumSquared += laplacian * laplacian;
      count++;
    }
  }

  if (count === 0) return 0;

  const mean = sum / count;
  const variance = Math.max(
    0,
    sumSquared / count - mean * mean,
  );

  return clamp(
    (variance / 250) * 100,
    0,
    100,
  );
}

function analyzePixels(
  pixels: Buffer,
  width: number,
  height: number,
): PixelAnalysis {
  const pixelCount = width * height;

  if (pixelCount === 0 || pixels.length !== pixelCount * 4) {
    throw new ImageAnalyzerError(
      "Unable to analyze image pixel data.",
      "INVALID_PIXEL_DATA",
    );
  }

  const histogram = new Uint32Array(256);
  const grayscale = new Uint8Array(pixelCount);

  let brightnessSum = 0;
  let brightnessSquaredSum = 0;
  let saturationSum = 0;

  let darkPixels = 0;
  let brightPixels = 0;
  let shadowClippedPixels = 0;
  let highlightClippedPixels = 0;

  for (
    let i = 0, pixelIndex = 0;
    i < pixels.length;
    i += 4, pixelIndex++
  ) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const alpha = pixels[i + 3] / 255;

    const red = r * alpha + 255 * (1 - alpha);
    const green = g * alpha + 255 * (1 - alpha);
    const blue = b * alpha + 255 * (1 - alpha);

    const pixelLuminance = getLuminance(red, green, blue);
    const luminanceValue = Math.round(
      clamp(pixelLuminance, 0, 255),
    );

    grayscale[pixelIndex] = luminanceValue;
    histogram[luminanceValue]++;

    brightnessSum += pixelLuminance;
    brightnessSquaredSum += pixelLuminance * pixelLuminance;

    const maxChannel = Math.max(red, green, blue);
    const minChannel = Math.min(red, green, blue);

    const saturation =
      maxChannel === 0
        ? 0
        : (maxChannel - minChannel) / maxChannel;

    saturationSum += saturation;

    if (pixelLuminance < 30) darkPixels++;
    if (pixelLuminance > 225) brightPixels++;

    if (pixelLuminance <= 5) shadowClippedPixels++;
    if (pixelLuminance >= 250) highlightClippedPixels++;
  }

  const brightness = brightnessSum / pixelCount;

  const variance = Math.max(
    0,
    brightnessSquaredSum / pixelCount -
      brightness * brightness,
  );

  const contrast = Math.sqrt(variance);

  let entropy = 0;

  for (let i = 0; i < histogram.length; i++) {
    const frequency = histogram[i];

    if (frequency === 0) continue;

    const probability = frequency / pixelCount;
    entropy -= probability * Math.log2(probability);
  }

  const sharpness = calculateSharpness(
    grayscale,
    width,
    height,
  );

  return {
    brightness: round(brightness),
    contrast: round(contrast),
    saturation: round((saturationSum / pixelCount) * 100),
    entropy: round(entropy),
    sharpness: round(sharpness),
    darkPixelPercentage: round(
      (darkPixels / pixelCount) * 100,
    ),
    brightPixelPercentage: round(
      (brightPixels / pixelCount) * 100,
    ),
    shadowClippingPercentage: round(
      (shadowClippedPixels / pixelCount) * 100,
    ),
    highlightClippingPercentage: round(
      (highlightClippedPixels / pixelCount) * 100,
    ),
  };
}

function generateRecommendations(
  metrics: PixelAnalysis,
): ImageAnalysisResult["recommendations"] {
  let brightness = 0;
  let contrast = 0;
  let saturation = 0;
  let sharpness = 20;

  // Conservative exposure adjustment.
  if (
    metrics.brightness < 110 &&
    metrics.shadowClippingPercentage < 35
  ) {
    brightness = clamp(
      Math.round((130 - metrics.brightness) * 0.3),
      5,
      25,
    );
  } else if (
    metrics.brightness > 165 &&
    metrics.highlightClippingPercentage < 35
  ) {
    brightness = clamp(
      Math.round((130 - metrics.brightness) * 0.2),
      -20,
      -5,
    );
  }

  // Protect images that already have strong contrast.
  if (
    metrics.contrast < 35 &&
    metrics.highlightClippingPercentage < 20 &&
    metrics.shadowClippingPercentage < 20
  ) {
    contrast = clamp(
      Math.round((45 - metrics.contrast) * 0.5),
      5,
      15,
    );
  }

  // Natural saturation correction.
  if (metrics.saturation < 25) {
    saturation = clamp(
      Math.round((35 - metrics.saturation) * 0.4),
      5,
      12,
    );
  } else if (metrics.saturation > 75) {
    saturation = -5;
  }

  // Avoid aggressive sharpening on already detailed images.
  if (metrics.sharpness < 12) {
    sharpness = 30;
  } else if (metrics.sharpness > 55) {
    sharpness = 10;
  }

  return {
    brightness,
    contrast,
    saturation,
    sharpness,

    // Noise cannot reliably be separated from fine details
    // using basic luminance statistics alone.
    noiseReduction: 0,

    autoExposure: true,
    autoContrast: true,
    autoColorCorrection: true,
  };
}

export async function analyzeImage(
  input: ImageAnalyzerInput,
): Promise<ImageAnalysisResult> {
  try {
    if (
      !input ||
      (!Buffer.isBuffer(input.input) &&
        typeof input.input !== "string")
    ) {
      throw new ImageAnalyzerError(
        "A valid image Buffer or file path is required.",
        "INVALID_INPUT",
      );
    }

    if (
      typeof input.input === "string" &&
      input.input.trim().length === 0
    ) {
      throw new ImageAnalyzerError(
        "Image file path cannot be empty.",
        "INVALID_INPUT",
      );
    }

    const metadata = await sharp(input.input, {
      failOn: "error",
      limitInputPixels: MAX_IMAGE_PIXELS,
      sequentialRead: true,
    }).metadata();

    if (
      !metadata.width ||
      !metadata.height ||
      !metadata.format
    ) {
      throw new ImageAnalyzerError(
        "Image dimensions or format could not be detected.",
        "INVALID_IMAGE_METADATA",
      );
    }

    if (!ALLOWED_FORMATS.has(metadata.format)) {
      throw new ImageAnalyzerError(
        "Unsupported image format.",
        "UNSUPPORTED_IMAGE_FORMAT",
      );
    }

    const totalPixels = metadata.width * metadata.height;

    if (
      !Number.isSafeInteger(totalPixels) ||
      totalPixels > MAX_IMAGE_PIXELS
    ) {
      throw new ImageAnalyzerError(
        "Image dimensions exceed the allowed limit.",
        "IMAGE_TOO_LARGE",
      );
    }

    const { data, info } = await sharp(input.input, {
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

    if (info.channels !== 4) {
      throw new ImageAnalyzerError(
        "Unexpected image pixel format.",
        "INVALID_PIXEL_DATA",
      );
    }

    const metrics = analyzePixels(
      data,
      info.width,
      info.height,
    );

    const recommendations = generateRecommendations(metrics);

    const exposureScore = clamp(
      100 -
        Math.abs(metrics.brightness - 130) * 0.8 -
        metrics.shadowClippingPercentage * 0.4 -
        metrics.highlightClippingPercentage * 0.4,
      0,
      100,
    );

    return {
      metadata: {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: metadata.size ?? 0,
        hasAlpha: metadata.hasAlpha ?? false,
      },

      metrics,

      assessment: {
        exposure: getQualityLevel(exposureScore, 45, 75),
        contrast: getQualityLevel(metrics.contrast, 25, 45),
        color: getQualityLevel(metrics.saturation, 12, 30),
        sharpness: getQualityLevel(metrics.sharpness, 12, 35),
      },

      recommendations,
    };
  } catch (error) {
    if (error instanceof ImageAnalyzerError) {
      throw error;
    }

    throw new ImageAnalyzerError(
      "Image analysis failed. The uploaded file may be invalid or corrupted.",
      "IMAGE_ANALYSIS_FAILED",
    );
  }
}
