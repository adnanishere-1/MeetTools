import { Response } from 'express';
import { Preset } from '../models/Preset.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { STATUS_CODES } from '../utils/statusCodes.js';

export const createPreset = asyncHandler(async (req: any, res: Response) => {
  const userId = req.user.id;
  const { name, description, options, isDefault } = req.body;

  if (isDefault) {
    await Preset.updateMany({ userId }, { isDefault: false });
  }

  const preset = await Preset.create({
    userId,
    name,
    description,
    options,
    isDefault: Boolean(isDefault),
  });

  return res.status(STATUS_CODES.CREATED).json({
    success: true,
    message: 'Preset created successfully',
    preset,
  });
});

export const getUserPresets = asyncHandler(async (req: any, res: Response) => {
  const userId = req.user.id;
  const presets = await Preset.find({ userId }).sort({ createdAt: -1 });

  return res.status(STATUS_CODES.OK).json({
    success: true,
    count: presets.length,
    presets,
  });
});

export const deletePreset = asyncHandler(async (req: any, res: Response) => {
  const userId = req.user.id;
  const { presetId } = req.params;

  const preset = await Preset.findOneAndDelete({ _id: presetId, userId });
  if (!preset) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, 'Preset not found');
  }

  return res.status(STATUS_CODES.OK).json({
    success: true,
    message: 'Preset deleted successfully',
  });
});