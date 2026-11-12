
import sharp from "sharp";

const MAX_IMAGE_PIXELS = 40_000_000;
const ANALYSIS_SIZE = 256;

const SUPPORTED_FORMATS = new Set([
  "jpeg",
  "png",
  "webp",
  "tiff",
]);

const MIN_SATURATION = 0;
const MAX_SATURATION = 2;

const MIN_TEMPERATURE = -100;
const MAX_TEMPERATURE = 100;

const MIN_TINT = -100;
const MAX_TINT = 100;

const MAX_CHANNEL_GAIN = 1.25;

export interface ColorCorrectionOptions {
  saturation?: number;
  temperature?: number;
  tint?: number;
  auto?: boolean;
  targetSaturation?: number;
  autoWhiteBalance?: boolean;
  whiteBalanceStrength?: number;
}

export interface ColorCorrectionResult {
  buffer: Buffer;

  adjustment: {
    saturation: number;
    temperature: number;
    tint: number;
    automatic: boolean;
  };

  analysis: {
    originalSaturation: number;
    estimatedSaturation: number;
    averageRed: number;
    averageGreen: number;
    averageBlue: number;
    colorCast: "warm" | "cool" | "green" | "magenta" | "neutral";
  };
}

export class ColorCorrectionError extends Error {
  public readonly code: string;

  constructor(
    message: string,
    code = "COLOR_CORRECTION_FAILED",
  ) {
    super(message);
    this.name = "ColorCorrectionError";
    this.code = code;
  }
}

interface ColorAnalysis {
  saturation: number;
  averageRed: number;
  averageGreen: number;
  averageBlue: number;
  colorCast: ColorCorrectionResult["analysis"]["colorCast"];
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

function getColorCast(
  red: number,
  green: number,
  blue: number,
): ColorCorrectionResult["analysis"]["colorCast"] {
  const redGreenDifference = red - green;
  const blueGreenDifference = blue - green;

  if (
    Math.abs(redGreenDifference) < 5 &&
    Math.abs(blueGreenDifference) < 5
  ) {
    return "neutral";
  }

  if (
    red > blue * 1.08 &&
    redGreenDifference > 3
  ) {
    return "warm";
  }

  if (
    blue > red * 1.08 &&
    blueGreenDifference > 3
  ) {
    return "cool";
  }

  if (green > red * 1.06 && green > blue * 1.06) {
    return "green";
  }

  if (red > green * 1.08 && blue > green * 1.08) {
    return "magenta";
  }

  return "neutral";
}

async function analyzeColors(
  input: Buffer,
): Promise<ColorAnalysis> {
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
    throw new ColorCorrectionError(
      "Unable to read image color data.",
      "INVALID_PIXEL_DATA",
    );
  }

  const pixelCount = info.width * info.height;

  let redSum = 0;
  let greenSum = 0;
  let blueSum = 0;
  let saturationSum = 0;

  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3] / 255;

    const red = data[i] * alpha + 128 * (1 - alpha);
    const green = data[i + 1] * alpha + 128 * (1 - alpha);
    const blue = data[i + 2] * alpha + 128 * (1 - alpha);

    redSum += red;
    greenSum += green;
    blueSum += blue;

    const maxChannel = Math.max(red, green, blue);
    const minChannel = Math.min(red, green, blue);

    const saturation =
      maxChannel === 0
        ? 0
        : (maxChannel - minChannel) / maxChannel;

    saturationSum += saturation;
  }

  const averageRed = redSum / pixelCount;
  const averageGreen = greenSum / pixelCount;
  const averageBlue = blueSum / pixelCount;

  return {
    saturation: (saturationSum / pixelCount) * 100,
    averageRed,
    averageGreen,
    averageBlue,
    colorCast: getColorCast(
      averageRed,
      averageGreen,
      averageBlue,
    ),
  };
}

function calculateAutoSaturation(
  currentSaturation: number,
  targetSaturation: number,
): number {
  if (Math.abs(targetSaturation - currentSaturation) < 5) {
    return 1;
  }

  if (currentSaturation < 1) {
    return 1;
  }

  return clamp(
    targetSaturation / currentSaturation,
    0.85,
    1.2,
  );
}

function calculateWhiteBalance(
  analysis: ColorAnalysis,
  strength: number,
): {
  redGain: number;
  greenGain: number;
  blueGain: number;
} {
  const average = (
    analysis.averageRed +
    analysis.averageGreen +
    analysis.averageBlue
  ) / 3;

  if (average < 10) {
    return {
      redGain: 1,
      greenGain: 1,
      blueGain: 1,
    };
  }

  const safeRed = Math.max(analysis.averageRed, 1);
  const safeGreen = Math.max(analysis.averageGreen, 1);
  const safeBlue = Math.max(analysis.averageBlue, 1);

  const redGain = average / safeRed;
  const greenGain = average / safeGreen;
  const blueGain = average / safeBlue;

  return {
    redGain: clamp(
      1 + (redGain - 1) * strength,
      1 / MAX_CHANNEL_GAIN,
      MAX_CHANNEL_GAIN,
    ),
    greenGain: clamp(
      1 + (greenGain - 1) * strength,
      1 / MAX_CHANNEL_GAIN,
      MAX_CHANNEL_GAIN,
    ),
    blueGain: clamp(
      1 + (blueGain - 1) * strength,
      1 / MAX_CHANNEL_GAIN,
      MAX_CHANNEL_GAIN,
    ),
  };
}

export async function correctColors(
  input: Buffer,
  options: ColorCorrectionOptions = {},
): Promise<ColorCorrectionResult> {
  try {
    if (!Buffer.isBuffer(input) || input.length === 0) {
      throw new ColorCorrectionError(
        "A valid non-empty image Buffer is required.",
        "INVALID_INPUT",
      );
    }

    const {
      saturation,
      temperature = 0,
      tint = 0,
      auto = true,
      targetSaturation = 35,
      autoWhiteBalance = true,
      whiteBalanceStrength = 0.25,
    } = options;

    if (
      saturation !== undefined &&
      (!Number.isFinite(saturation) ||
        saturation < MIN_SATURATION ||
        saturation > MAX_SATURATION)
    ) {
      throw new ColorCorrectionError(
        "Saturation must be between 0 and 2.",
        "INVALID_SATURATION",
      );
    }

    if (
      !Number.isFinite(temperature) ||
      temperature < MIN_TEMPERATURE ||
      temperature > MAX_TEMPERATURE
    ) {
      throw new ColorCorrectionError(
        "Temperature must be between -100 and +100.",
        "INVALID_TEMPERATURE",
      );
    }

    if (
      !Number.isFinite(tint) ||
      tint < MIN_TINT ||
      tint > MAX_TINT
    ) {
      throw new ColorCorrectionError(
        "Tint must be between -100 and +100.",
        "INVALID_TINT",
      );
    }

    if (
      !Number.isFinite(targetSaturation) ||
      targetSaturation < 10 ||
      targetSaturation > 80
    ) {
      throw new ColorCorrectionError(
        "Target saturation must be between 10 and 80.",
        "INVALID_TARGET_SATURATION",
      );
    }

    if (
      !Number.isFinite(whiteBalanceStrength) ||
      whiteBalanceStrength < 0 ||
      whiteBalanceStrength > 1
    ) {
      throw new ColorCorrectionError(
        "White balance strength must be between 0 and 1.",
        "INVALID_WHITE_BALANCE_STRENGTH",
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
      throw new ColorCorrectionError(
        "Image metadata is invalid.",
        "INVALID_IMAGE",
      );
    }

    if (!SUPPORTED_FORMATS.has(metadata.format)) {
      throw new ColorCorrectionError(
        "Unsupported image format.",
        "UNSUPPORTED_FORMAT",
      );
    }

    const analysis = await analyzeColors(input);

    const automatic = saturation === undefined && auto;

    const saturationMultiplier =
      saturation !== undefined
        ? saturation
        : auto
          ? calculateAutoSaturation(
              analysis.saturation,
              targetSaturation,
            )
          : 1;

    const gains =
      auto && autoWhiteBalance
        ? calculateWhiteBalance(
            analysis,
            whiteBalanceStrength,
          )
        : {
            redGain: 1,
            greenGain: 1,
            blueGain: 1,
          };

    const temperatureFactor = temperature / 100;
    const tintFactor = tint / 100;

    const redGain = clamp(
      gains.redGain * (1 + temperatureFactor * 0.12),
      0.5,
      1.5,
    );

    const greenGain = clamp(
      gains.greenGain * (1 - tintFactor * 0.1),
      0.5,
      1.5,
    );

    const blueGain = clamp(
      gains.blueGain * (1 - temperatureFactor * 0.12),
      0.5,
      1.5,
    );

    const hasColorChanges =
      Math.abs(saturationMultiplier - 1) >= 0.001 ||
      Math.abs(redGain - 1) >= 0.001 ||
      Math.abs(greenGain - 1) >= 0.001 ||
      Math.abs(blueGain - 1) >= 0.001;

    if (!hasColorChanges) {
      return {
        buffer: input,
        adjustment: {
          saturation: 1,
          temperature,
          tint,
          automatic,
        },
        analysis: {
          originalSaturation: round(analysis.saturation),
          estimatedSaturation: round(analysis.saturation),
          averageRed: round(analysis.averageRed),
          averageGreen: round(analysis.averageGreen),
          averageBlue: round(analysis.averageBlue),
          colorCast: analysis.colorCast,
        },
      };
    }

    // Apply color correction to RGB while preserving alpha.
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

    const output = Buffer.alloc(data.length);

    const saturationStrength = saturationMultiplier;

    for (let i = 0; i < data.length; i += 4) {
      const red = data[i];
      const green = data[i + 1];
      const blue = data[i + 2];

      const luminance =
        red * 0.2126 +
        green * 0.7152 +
        blue * 0.0722;

      output[i] = Math.round(clamp(
        (luminance + (red - luminance) * saturationStrength) *
          redGain,
        0,
        255,
      ));

      output[i + 1] = Math.round(clamp(
        (luminance + (green - luminance) * saturationStrength) *
          greenGain,
        0,
        255,
      ));

      output[i + 2] = Math.round(clamp(
        (luminance + (blue - luminance) * saturationStrength) *
          blueGain,
        0,
        255,
      ));

      output[i + 3] = data[i + 3];
    }

    const correctedBuffer = await sharp(output, {
      raw: {
        width: info.width,
        height: info.height,
        channels: 4,
      },
      limitInputPixels: MAX_IMAGE_PIXELS,
    })
      .png()
      .toBuffer();

    return {
      buffer: correctedBuffer,

      adjustment: {
        saturation: round(saturationMultiplier),
        temperature,
        tint,
        automatic,
      },

      analysis: {
        originalSaturation: round(analysis.saturation),
        estimatedSaturation: round(
          analysis.saturation * saturationMultiplier,
        ),
        averageRed: round(analysis.averageRed),
        averageGreen: round(analysis.averageGreen),
        averageBlue: round(analysis.averageBlue),
        colorCast: analysis.colorCast,
      },
    };
  } catch (error) {
    if (error instanceof ColorCorrectionError) {
      throw error;
    }

    throw new ColorCorrectionError(
      "Unable to correct image colors. The image may be corrupted or unsupported.",
    );
  }
}
