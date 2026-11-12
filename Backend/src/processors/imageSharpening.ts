
import sharp from "sharp";

const MAX_IMAGE_PIXELS = 40_000_000;

const SUPPORTED_FORMATS = new Set([
  "jpeg",
  "png",
  "webp",
  "tiff",
]);

const MIN_STRENGTH = 0;
const MAX_STRENGTH = 100;

const MIN_RADIUS = 0.3;
const MAX_RADIUS = 3;

const MIN_THRESHOLD = 0;
const MAX_THRESHOLD = 100;

const DEFAULT_STRENGTH = 30;
const DEFAULT_RADIUS = 0.9;
const DEFAULT_THRESHOLD = 3;

export interface ImageSharpeningOptions {
  strength?: number;
  auto?: boolean;
  radius?: number;
  threshold?: number;
  detailPreservation?: number;
  luminanceOnly?: boolean;
}

export interface ImageSharpeningResult {
  buffer: Buffer;
  adjustment: {
    strength: number;
    radius: number;
    sigma: number;
    threshold: number;
    automatic: boolean;
  };
  analysis: {
    edgeActivity: number;
    estimatedSharpness: number;
    recommendation: number;
  };
}

export class ImageSharpeningError extends Error {
  public readonly code: string;

  constructor(
    message: string,
    code = "IMAGE_SHARPENING_FAILED",
  ) {
    super(message);
    this.name = "ImageSharpeningError";
    this.code = code;
  }
}

interface SharpnessAnalysis {
  edgeActivity: number;
  estimatedSharpness: number;
}

interface UnsharpParameters {
  sigma: number;
  m1: number;
  m2: number;
  x1: number;
  y2: number;
}

function clamp(
  value: number,
  min: number,
  max: number,
): number {
  return Math.min(Math.max(value, min), max);
}

function round(
  value: number,
  decimals = 3,
): number {
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

/**
 * Analyze image sharpness using a small image copy.
 * This is a heuristic, not a definitive blur detector.
 */
async function analyzeSharpness(
  input: Buffer,
): Promise<SharpnessAnalysis> {
  const { data, info } = await sharp(input, {
    failOn: "error",
    limitInputPixels: MAX_IMAGE_PIXELS,
    sequentialRead: true,
  })
    .rotate()
    .toColourspace("srgb")
    .resize({
      width: 256,
      height: 256,
      fit: "inside",
      withoutEnlargement: true,
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  if (
    info.channels !== 4 ||
    info.width < 3 ||
    info.height < 3
  ) {
    throw new ImageSharpeningError(
      "Image is too small or pixel data is invalid.",
      "INVALID_PIXEL_DATA",
    );
  }

  const gray = new Float32Array(info.width * info.height);

  for (
    let i = 0, pixel = 0;
    i < data.length;
    i += 4, pixel++
  ) {
    const alpha = data[i + 3] / 255;

    const red = data[i] * alpha + 255 * (1 - alpha);
    const green = data[i + 1] * alpha + 255 * (1 - alpha);
    const blue = data[i + 2] * alpha + 255 * (1 - alpha);

    gray[pixel] = getLuminance(red, green, blue);
  }

  let laplacianSum = 0;
  let laplacianSquaredSum = 0;
  let edgeSum = 0;
  let count = 0;

  const width = info.width;
  const height = info.height;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const index = y * width + x;
      const center = gray[index];

      const laplacian =
        gray[index - width] +
        gray[index + width] +
        gray[index - 1] +
        gray[index + 1] -
        4 * center;

      const gradientX =
        gray[index + 1] - gray[index - 1];

      const gradientY =
        gray[index + width] - gray[index - width];

      laplacianSum += laplacian;
      laplacianSquaredSum += laplacian * laplacian;

      edgeSum += Math.sqrt(
        gradientX * gradientX +
        gradientY * gradientY,
      );

      count++;
    }
  }

  if (count === 0) {
    throw new ImageSharpeningError(
      "Unable to analyze image sharpness.",
      "ANALYSIS_FAILED",
    );
  }

  const mean = laplacianSum / count;

  const variance = Math.max(
    0,
    laplacianSquaredSum / count - mean * mean,
  );

  return {
    edgeActivity: edgeSum / count,
    estimatedSharpness: variance,
  };
}

function calculateAutomaticStrength(
  analysis: SharpnessAnalysis,
): number {
  const sharpness = analysis.estimatedSharpness;

  if (sharpness > 500) return 0;
  if (sharpness > 250) return 10;
  if (sharpness > 120) return 20;
  if (sharpness > 50) return 30;

  return 40;
}

function getUnsharpParameters(
  strength: number,
  radius: number,
  threshold: number,
): UnsharpParameters {
  const normalizedStrength = strength / 100;

  const sigma = clamp(radius, MIN_RADIUS, MAX_RADIUS);

  const m1 = clamp(
    0.5 + normalizedStrength * 1.2,
    0.5,
    1.7,
  );

  const m2 = clamp(
    1 + normalizedStrength * 1.5,
    1,
    2.5,
  );

  const x1 = clamp(Math.round(threshold), 0, 100);

  const y2 = clamp(
    Math.round(threshold + 20),
    x1,
    120,
  );

  return {
    sigma,
    m1,
    m2,
    x1,
    y2,
  };
}

/**
 * Sharpen an image with controlled natural detail enhancement.
 *
 * Sharp's sharpen operation targets luminance.
 * Higher detailPreservation reduces sharpening strength.
 */
export async function sharpenImage(
  input: Buffer,
  options: ImageSharpeningOptions = {},
): Promise<ImageSharpeningResult> {
  try {
    if (!Buffer.isBuffer(input) || input.length === 0) {
      throw new ImageSharpeningError(
        "A valid non-empty image Buffer is required.",
        "INVALID_INPUT",
      );
    }

    const {
      strength,
      auto = true,
      radius = DEFAULT_RADIUS,
      threshold = DEFAULT_THRESHOLD,
      detailPreservation = 60,
      luminanceOnly = true,
    } = options;

    if (
      strength !== undefined &&
      (!Number.isFinite(strength) ||
        strength < MIN_STRENGTH ||
        strength > MAX_STRENGTH)
    ) {
      throw new ImageSharpeningError(
        "Sharpening strength must be between 0 and 100.",
        "INVALID_STRENGTH",
      );
    }

    if (
      !Number.isFinite(radius) ||
      radius < MIN_RADIUS ||
      radius > MAX_RADIUS
    ) {
      throw new ImageSharpeningError(
        "Sharpening radius must be between 0.3 and 3.",
        "INVALID_RADIUS",
      );
    }

    if (
      !Number.isFinite(threshold) ||
      threshold < MIN_THRESHOLD ||
      threshold > MAX_THRESHOLD
    ) {
      throw new ImageSharpeningError(
        "Sharpening threshold must be between 0 and 100.",
        "INVALID_THRESHOLD",
      );
    }

    if (
      !Number.isFinite(detailPreservation) ||
      detailPreservation < 0 ||
      detailPreservation > 100
    ) {
      throw new ImageSharpeningError(
        "Detail preservation must be between 0 and 100.",
        "INVALID_DETAIL_PRESERVATION",
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
      throw new ImageSharpeningError(
        "Image metadata is invalid.",
        "INVALID_IMAGE",
      );
    }

    if (!SUPPORTED_FORMATS.has(metadata.format)) {
      throw new ImageSharpeningError(
        "Unsupported image format.",
        "UNSUPPORTED_FORMAT",
      );
    }

    const pixelCount = metadata.width * metadata.height;

    if (
      !Number.isSafeInteger(pixelCount) ||
      pixelCount > MAX_IMAGE_PIXELS
    ) {
      throw new ImageSharpeningError(
        "Image exceeds the maximum allowed pixel count.",
        "IMAGE_TOO_LARGE",
      );
    }

    const analysis = await analyzeSharpness(input);

    const automatic = strength === undefined && auto;

    const recommendedStrength =
      strength !== undefined
        ? strength
        : auto
          ? calculateAutomaticStrength(analysis)
          : DEFAULT_STRENGTH;

    const effectiveStrength = clamp(
      recommendedStrength *
        (1 - detailPreservation / 100),
      0,
      100,
    );

    if (effectiveStrength <= 0) {
      return {
        buffer: input,
        adjustment: {
          strength: 0,
          radius,
          sigma: radius,
          threshold,
          automatic,
        },
        analysis: {
          edgeActivity: round(analysis.edgeActivity),
          estimatedSharpness: round(
            analysis.estimatedSharpness,
          ),
          recommendation: recommendedStrength,
        },
      };
    }

    const parameters = getUnsharpParameters(
      effectiveStrength,
      radius,
      threshold,
    );

    const output = await sharp(input, {
      failOn: "error",
      limitInputPixels: MAX_IMAGE_PIXELS,
      sequentialRead: true,
    })
      .sharpen({
        sigma: parameters.sigma,
        m1: parameters.m1,
        m2: parameters.m2,
        x1: parameters.x1,
        y2: parameters.y2,
      })
      .toBuffer();

    return {
      buffer: output,
      adjustment: {
        strength: round(effectiveStrength),
        radius,
        sigma: parameters.sigma,
        threshold,
        automatic,
      },
      analysis: {
        edgeActivity: round(analysis.edgeActivity),
        estimatedSharpness: round(
          analysis.estimatedSharpness,
        ),
        recommendation: recommendedStrength,
      },
    };
  } catch (error) {
    if (error instanceof ImageSharpeningError) {
      throw error;
    }

    throw new ImageSharpeningError(
      "Unable to sharpen image. The image may be corrupted or unsupported.",
    );
  }
}
