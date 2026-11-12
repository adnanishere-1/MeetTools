
import sharp from "sharp";

const MAX_IMAGE_PIXELS = 40_000_000;
const ANALYSIS_SIZE = 256;

const SUPPORTED_FORMATS = new Set([
  "jpeg",
  "png",
  "webp",
  "tiff",
]);

export interface NoiseReductionOptions {
  strength?: number;
  auto?: boolean;
  detailPreservation?: number;
  gaussianSmoothing?: boolean;
  preserveAlpha?: boolean;
}

export interface NoiseReductionResult {
  buffer: Buffer;

  adjustment: {
    strength: number;
    medianSize: 3 | 5;
    gaussianApplied: boolean;
    detailPreservation: number;
    automatic: boolean;
  };

  analysis: {
    estimatedNoise: number;
    edgeActivity: number;
    recommendation: number;
  };
}

export class NoiseReductionError extends Error {
  public readonly code: string;

  constructor(
    message: string,
    code = "NOISE_REDUCTION_FAILED",
  ) {
    super(message);
    this.name = "NoiseReductionError";
    this.code = code;
  }
}

interface NoiseAnalysis {
  estimatedNoise: number;
  edgeActivity: number;
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
  decimals = 2,
): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function luminance(
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

async function analyzeNoise(
  input: Buffer,
): Promise<NoiseAnalysis> {
  const { data, info } = await sharp(input, {
    failOn: "error",
    limitInputPixels: MAX_IMAGE_PIXELS,
  })
    .rotate()
    .toColourspace("srgb")
    .resize({
      width: ANALYSIS_SIZE,
      height: ANALYSIS_SIZE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  if (
    info.channels !== 3 ||
    info.width < 3 ||
    info.height < 3
  ) {
    throw new NoiseReductionError(
      "Image pixel data is invalid or too small.",
      "INVALID_PIXEL_DATA",
    );
  }

  const width = info.width;
  const height = info.height;

  const gray = new Float32Array(width * height);

  for (
    let i = 0, p = 0;
    i < data.length;
    i += 3, p++
  ) {
    gray[p] = luminance(
      data[i],
      data[i + 1],
      data[i + 2],
    );
  }

  let differenceSum = 0;
  let differenceSquaredSum = 0;
  let edgeSum = 0;
  let sampleCount = 0;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const index = y * width + x;

      const center = gray[index];

      const horizontalDifference = Math.abs(
        gray[index + 1] - gray[index - 1],
      );

      const verticalDifference = Math.abs(
        gray[index + width] - gray[index - width],
      );

      const diagonalDifference = Math.abs(
        gray[index + width + 1] -
        gray[index - width - 1],
      );

      const difference = (
        horizontalDifference +
        verticalDifference +
        diagonalDifference
      ) / 3;

      differenceSum += difference;
      differenceSquaredSum += difference * difference;

      const laplacian = Math.abs(
        gray[index - width] +
        gray[index + width] +
        gray[index - 1] +
        gray[index + 1] -
        4 * center,
      );

      edgeSum += laplacian;
      sampleCount++;
    }
  }

  if (sampleCount === 0) {
    throw new NoiseReductionError(
      "Unable to calculate image noise statistics.",
      "ANALYSIS_FAILED",
    );
  }

  const meanDifference = differenceSum / sampleCount;

  const variance = Math.max(
    0,
    differenceSquaredSum / sampleCount -
      meanDifference * meanDifference,
  );

  return {
    estimatedNoise: Math.sqrt(variance),
    edgeActivity: edgeSum / sampleCount,
  };
}

function calculateAutomaticStrength(
  analysis: NoiseAnalysis,
): number {
  const { estimatedNoise, edgeActivity } = analysis;

  if (estimatedNoise < 4 || edgeActivity > 35) {
    return 0;
  }

  if (estimatedNoise < 7) return 15;
  if (estimatedNoise < 12) return 25;
  if (estimatedNoise < 20) return 40;

  return 50;
}

function createResult(
  buffer: Buffer,
  strength: number,
  medianSize: 3 | 5,
  gaussianApplied: boolean,
  detailPreservation: number,
  automatic: boolean,
  analysis: NoiseAnalysis,
): NoiseReductionResult {
  return {
    buffer,

    adjustment: {
      strength,
      medianSize,
      gaussianApplied,
      detailPreservation,
      automatic,
    },

    analysis: {
      estimatedNoise: round(analysis.estimatedNoise),
      edgeActivity: round(analysis.edgeActivity),
      recommendation: strength,
    },
  };
}

/**
 * Reduce image noise while preserving image details
 * and original alpha transparency.
 */
export async function reduceNoise(
  input: Buffer,
  options: NoiseReductionOptions = {},
): Promise<NoiseReductionResult> {
  try {
    if (!Buffer.isBuffer(input) || input.length === 0) {
      throw new NoiseReductionError(
        "A valid non-empty image Buffer is required.",
        "INVALID_INPUT",
      );
    }

    const {
      strength,
      auto = true,
      detailPreservation = 65,
      gaussianSmoothing = false,
      preserveAlpha = true,
    } = options;

    if (
      strength !== undefined &&
      (
        !Number.isFinite(strength) ||
        strength < 0 ||
        strength > 100
      )
    ) {
      throw new NoiseReductionError(
        "Noise reduction strength must be between 0 and 100.",
        "INVALID_STRENGTH",
      );
    }

    if (
      !Number.isFinite(detailPreservation) ||
      detailPreservation < 0 ||
      detailPreservation > 100
    ) {
      throw new NoiseReductionError(
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
      throw new NoiseReductionError(
        "Image metadata is invalid.",
        "INVALID_IMAGE",
      );
    }

    if (!SUPPORTED_FORMATS.has(metadata.format)) {
      throw new NoiseReductionError(
        "Unsupported image format.",
        "UNSUPPORTED_FORMAT",
      );
    }

    const totalPixels = metadata.width * metadata.height;

    if (
      !Number.isSafeInteger(totalPixels) ||
      totalPixels > MAX_IMAGE_PIXELS
    ) {
      throw new NoiseReductionError(
        "Image exceeds the maximum allowed pixel count.",
        "IMAGE_TOO_LARGE",
      );
    }

    const analysis = await analyzeNoise(input);

    const automatic = strength === undefined && auto;

    const recommendedStrength =
      strength !== undefined
        ? strength
        : auto
          ? calculateAutomaticStrength(analysis)
          : 0;

    const effectiveStrength = clamp(
      recommendedStrength,
      0,
      100,
    );

    const medianSize: 3 | 5 =
      effectiveStrength >= 65 ? 5 : 3;

    if (
      effectiveStrength <= 0 ||
      detailPreservation >= 100
    ) {
      return createResult(
        input,
        effectiveStrength,
        medianSize,
        false,
        detailPreservation,
        automatic,
        analysis,
      );
    }

    const gaussianApplied =
      gaussianSmoothing && effectiveStrength >= 40;

    // Strength controls actual filter contribution.
    // Detail preservation reduces filtering to protect edges.
    const filteringStrength = clamp(
      (effectiveStrength / 100) *
        (1 - detailPreservation / 100),
      0,
      0.65,
    );

    if (filteringStrength <= 0) {
      return createResult(
        input,
        effectiveStrength,
        medianSize,
        false,
        detailPreservation,
        automatic,
        analysis,
      );
    }

    const normalized = await sharp(input, {
      failOn: "error",
      limitInputPixels: MAX_IMAGE_PIXELS,
    })
      .rotate()
      .toColourspace("srgb")
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { data, info } = normalized;

    const rgbBuffer = Buffer.alloc(
      info.width * info.height * 3,
    );

    for (
      let sourceIndex = 0, targetIndex = 0;
      sourceIndex < data.length;
      sourceIndex += 4, targetIndex += 3
    ) {
      rgbBuffer[targetIndex] = data[sourceIndex];
      rgbBuffer[targetIndex + 1] = data[sourceIndex + 1];
      rgbBuffer[targetIndex + 2] = data[sourceIndex + 2];
    }

    let filteredPipeline = sharp(rgbBuffer, {
      raw: {
        width: info.width,
        height: info.height,
        channels: 3,
      },
      limitInputPixels: MAX_IMAGE_PIXELS,
    }).median(medianSize);

    if (gaussianApplied) {
      filteredPipeline = filteredPipeline.blur(0.3);
    }

    const filteredRgb = await filteredPipeline
      .raw()
      .toBuffer();

    if (filteredRgb.length !== rgbBuffer.length) {
      throw new NoiseReductionError(
        "Filtered image dimensions changed unexpectedly.",
        "FILTER_OUTPUT_INVALID",
      );
    }

    const originalWeight = 1 - filteringStrength;
    const filteredWeight = filteringStrength;

    const outputRgba = Buffer.alloc(data.length);

    for (
      let sourceIndex = 0, rgbIndex = 0;
      sourceIndex < data.length;
      sourceIndex += 4, rgbIndex += 3
    ) {
      for (let channel = 0; channel < 3; channel++) {
        const originalValue = rgbBuffer[rgbIndex + channel];
        const filteredValue = filteredRgb[rgbIndex + channel];

        outputRgba[sourceIndex + channel] = Math.round(
          originalValue * originalWeight +
          filteredValue * filteredWeight,
        );
      }

      outputRgba[sourceIndex + 3] =
        preserveAlpha
          ? data[sourceIndex + 3]
          : 255;
    }

    const output = await sharp(outputRgba, {
      raw: {
        width: info.width,
        height: info.height,
        channels: 4,
      },
      limitInputPixels: MAX_IMAGE_PIXELS,
    })
      .png()
      .toBuffer();

    return createResult(
      output,
      effectiveStrength,
      medianSize,
      gaussianApplied,
      detailPreservation,
      automatic,
      analysis,
    );
  } catch (error) {
    if (error instanceof NoiseReductionError) {
      throw error;
    }

    const originalMessage =
      error instanceof Error
        ? error.message
        : String(error);

    console.error(
      "[NoiseReduction] Processing failed:",
      error,
    );

    throw new NoiseReductionError(
      `Noise reduction failed: ${originalMessage}`,
      "NOISE_REDUCTION_FAILED",
    );
  }
}
