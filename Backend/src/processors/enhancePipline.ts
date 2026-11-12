
import sharp from "sharp";

import { analyzeImage } from "./imageAnalyzer";
import { correctExposure } from "../processors/exposureCorrection";
import { enhanceContrast } from "../processors/contrastEnhancement";
import { correctColors } from "../processors/colorCorrection";
import { reduceNoise } from "../processors/noiseReduction";
import { sharpenImage } from "../processors/imageSharpening";

import type { ImageEnhancementOptions } from "../validators/imageEnhancer.validation";

const MAX_IMAGE_PIXELS = 40_000_000;
const MAX_INPUT_BYTES = 10 * 1024 * 1024;

const SUPPORTED_FORMATS = new Set([
  "jpeg",
  "png",
  "webp",
  "tiff",
]);

export type EnhancementOutputFormat =
  | "webp"
  | "jpeg"
  | "png";

export interface EnhancementPipelineInput {
  input: Buffer;
  options: ImageEnhancementOptions;
}

export interface EnhancementPipelineResult {
  buffer: Buffer;

  metadata: {
    inputFormat: string;
    outputFormat: EnhancementOutputFormat;
    inputSize: number;
    outputSize: number;
    width: number;
    height: number;
    compressionRatio: number;
  };

  analysis: Awaited<ReturnType<typeof analyzeImage>>;

  adjustments: {
    exposure: {
      exposureStops: number;
      brightnessMultiplier: number;
    };
    contrast: {
      multiplier: number;
    };
    color: {
      saturation: number;
      temperature: number;
      tint: number;
    };
    noiseReduction: {
      strength: number;
      medianSize: number;
    };
    sharpening: {
      strength: number;
      radius: number;
      threshold: number;
    };
  };

  processing: {
    durationMs: number;
    steps: string[];
  };
}

export class EnhancementPipelineError extends Error {
  public readonly code: string;
  public readonly step?: string;

  constructor(
    message: string,
    code = "ENHANCEMENT_PIPELINE_FAILED",
    step?: string,
  ) {
    super(message);
    this.name = "EnhancementPipelineError";
    this.code = code;
    this.step = step;
  }
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

async function validateInputImage(
  input: Buffer,
): Promise<{
  format: string;
  width: number;
  height: number;
}> {
  if (!Buffer.isBuffer(input) || input.length === 0) {
    throw new EnhancementPipelineError(
      "A valid image Buffer is required.",
      "INVALID_INPUT",
    );
  }

  if (input.length > MAX_INPUT_BYTES) {
    throw new EnhancementPipelineError(
      "Image exceeds the maximum allowed file size.",
      "IMAGE_TOO_LARGE",
    );
  }

  let metadata: sharp.Metadata;

  try {
    metadata = await sharp(input, {
      failOn: "error",
      limitInputPixels: MAX_IMAGE_PIXELS,
    }).metadata();
  } catch (error) {
    throw new EnhancementPipelineError(
      error instanceof Error
        ? `Image validation failed: ${error.message}`
        : "Uploaded file is not a valid supported image.",
      "INVALID_IMAGE",
      "input-validation",
    );
  }

  if (
    !metadata.width ||
    !metadata.height ||
    !metadata.format
  ) {
    throw new EnhancementPipelineError(
      "Image metadata is incomplete.",
      "INVALID_IMAGE_METADATA",
      "input-validation",
    );
  }

  if (!SUPPORTED_FORMATS.has(metadata.format)) {
    throw new EnhancementPipelineError(
      "Unsupported image format.",
      "UNSUPPORTED_FORMAT",
      "input-validation",
    );
  }

  const totalPixels = metadata.width * metadata.height;

  if (
    !Number.isSafeInteger(totalPixels) ||
    totalPixels > MAX_IMAGE_PIXELS
  ) {
    throw new EnhancementPipelineError(
      "Image dimensions exceed the allowed pixel count.",
      "IMAGE_TOO_LARGE",
      "input-validation",
    );
  }

  return {
    format: metadata.format,
    width: metadata.width,
    height: metadata.height,
  };
}

function encodeOutput(
  image: sharp.Sharp,
  format: EnhancementOutputFormat,
  quality: number,
): sharp.Sharp {
  switch (format) {
    case "webp":
      return image.webp({
        quality,
        effort: 5,
        smartSubsample: true,
      });

    case "jpeg":
      return image.jpeg({
        quality,
        mozjpeg: true,
        chromaSubsampling: "4:4:4",
      });

    case "png":
      return image.png({
        compressionLevel: 8,
        adaptiveFiltering: true,
      });

    default:
      throw new EnhancementPipelineError(
        "Unsupported output format.",
        "UNSUPPORTED_OUTPUT_FORMAT",
        "output-encoding",
      );
  }
}

async function executeStep<T>(
  name: string,
  operation: () => Promise<T>,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof EnhancementPipelineError) {
      throw error;
    }

    const message =
      error instanceof Error
        ? error.message
        : "Unknown processor error";

    throw new EnhancementPipelineError(
      `${name} failed: ${message}`,
      `${name.toUpperCase().replace(/-/g, "_")}_FAILED`,
      name,
    );
  }
}

export async function runEnhancementPipeline(
  params: EnhancementPipelineInput,
): Promise<EnhancementPipelineResult> {
  const startedAt = Date.now();
  const { input, options } = params;

  try {
    if (!options || typeof options !== "object") {
      throw new EnhancementPipelineError(
        "Valid enhancement options are required.",
        "INVALID_OPTIONS",
      );
    }

    const inputMetadata = await validateInputImage(input);

    const requestedQuality = Number(options.outputQuality ?? 90);

    if (!Number.isFinite(requestedQuality)) {
      throw new EnhancementPipelineError(
        "Invalid output quality.",
        "INVALID_OUTPUT_QUALITY",
      );
    }

    const quality = clamp(requestedQuality, 80, 100);

    const outputFormat =
      options.outputFormat ?? "webp";

    if (
      !["webp", "jpeg", "png"].includes(outputFormat)
    ) {
      throw new EnhancementPipelineError(
        "Invalid output format.",
        "INVALID_OUTPUT_FORMAT",
      );
    }

    const steps: string[] = [];

    const analysis = await executeStep(
      "image-analysis",
      () => analyzeImage({ input }),
    );

    steps.push("image-analysis");

    let currentBuffer = input;

    const exposureResult = await executeStep(
      "exposure-correction",
      () => correctExposure(currentBuffer, {
        auto: options.autoExposure,
      }),
    );

    currentBuffer = exposureResult.buffer;
    steps.push("exposure-correction");

    const contrastResult = await executeStep(
      "contrast-enhancement",
      () => enhanceContrast(currentBuffer, {
        auto: options.autoContrast,
      }),
    );

    currentBuffer = contrastResult.buffer;
    steps.push("contrast-enhancement");

    const colorResult = await executeStep(
      "color-correction",
      () => correctColors(currentBuffer, {
        auto: options.autoColorCorrection,
        saturation: options.mode === "manual"
          ? 1 + options.saturation / 100
          : undefined,
      }),
    );

    currentBuffer = colorResult.buffer;
    steps.push("color-correction");

    const noiseResult = await executeStep(
      "noise-reduction",
      () => reduceNoise(currentBuffer, {
        auto: options.mode === "auto",
        strength: options.noiseReduction,
        detailPreservation: 75,
      }),
    );

    currentBuffer = noiseResult.buffer;
    steps.push("noise-reduction");

    const sharpeningResult = await executeStep(
      "image-sharpening",
      () => sharpenImage(currentBuffer, {
        auto: options.mode === "auto",
        strength: options.sharpness,
        detailPreservation: 70,
        luminanceOnly: true,
      }),
    );

    currentBuffer = sharpeningResult.buffer;
    steps.push("image-sharpening");

    const finalBuffer = await executeStep(
      "output-encoding",
      () => encodeOutput(
        sharp(currentBuffer, {
          failOn: "error",
          limitInputPixels: MAX_IMAGE_PIXELS,
        }).rotate(),
        outputFormat,
        quality,
      ).toBuffer(),
    );

    steps.push("output-encoding");

    const finalMetadata = await executeStep(
      "output-validation",
      () => sharp(finalBuffer, {
        failOn: "error",
        limitInputPixels: MAX_IMAGE_PIXELS,
      }).metadata(),
    );

    if (
      !finalMetadata.width ||
      !finalMetadata.height ||
      finalMetadata.format !== outputFormat
    ) {
      throw new EnhancementPipelineError(
        "Generated output failed validation.",
        "OUTPUT_VALIDATION_FAILED",
        "output-validation",
      );
    }

    const outputSize = finalBuffer.length;

    return {
      buffer: finalBuffer,

      metadata: {
        inputFormat: inputMetadata.format,
        outputFormat,
        inputSize: input.length,
        outputSize,
        width: finalMetadata.width,
        height: finalMetadata.height,
        compressionRatio: round(
          outputSize / input.length,
          3,
        ),
      },

      analysis,

      adjustments: {
        exposure: {
          exposureStops:
            exposureResult.adjustment.exposureStops,
          brightnessMultiplier:
            exposureResult.adjustment.brightnessMultiplier,
        },

        contrast: {
          multiplier:
            contrastResult.adjustment.contrast,
        },

        color: {
          saturation:
            colorResult.adjustment.saturation,
          temperature:
            colorResult.adjustment.temperature,
          tint:
            colorResult.adjustment.tint,
        },

        noiseReduction: {
          strength:
            noiseResult.adjustment.strength,
          medianSize:
            noiseResult.adjustment.medianSize,
        },

        sharpening: {
          strength:
            sharpeningResult.adjustment.strength,
          radius:
            sharpeningResult.adjustment.radius,
          threshold:
            sharpeningResult.adjustment.threshold,
        },
      },

      processing: {
        durationMs: Date.now() - startedAt,
        steps,
      },
    };
  } catch (error) {
    if (error instanceof EnhancementPipelineError) {
      throw error;
    }

    throw new EnhancementPipelineError(
      error instanceof Error
        ? error.message
        : "Unexpected image enhancement error.",
    );
  }
}
