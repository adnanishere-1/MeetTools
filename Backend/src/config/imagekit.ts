import ImageKit from 'imagekit';
import { logger } from '../utils/logger';
import dotenv from 'dotenv';
dotenv.config(); // Ensure environment variables are loaded before using them
// Environment variables validation
const publicKey = process.env.IMAGEKIT_PUBLIC_KEY;
const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT;

if (!publicKey || !privateKey || !urlEndpoint) {
  logger.warn('⚠️ ImageKit credentials are missing or incomplete in environment variables.');
}

// ImageKit instance initialize karein
export const imagekit = new ImageKit({
  publicKey: publicKey || '',
  privateKey: privateKey || '',
  urlEndpoint: urlEndpoint || '',
});

/**
 * Buffer ya file ko ImageKit par upload karne ke liye helper function
 */
export async function uploadToImageKit(
  fileBuffer: Buffer,
  fileName: string,
  folder: string = '/snapresize/uploads'
) {
  try {
    const response = await imagekit.upload({
      file: fileBuffer,
      fileName: fileName,
      folder: folder,
    });
    return response;
  } catch (error: any) {
    logger.error(`❌ ImageKit Upload Error for ${fileName}:`, error);
    throw new Error(`Failed to upload image to ImageKit: ${error.message}`);
  }
}

/**
 * ImageKit se file delete karne ke liye helper function
 */
export async function deleteFromImageKit(fileId: string) {
  try {
    await imagekit.deleteFile(fileId);
    logger.info(`🗑️ Successfully deleted file from ImageKit: ${fileId}`);
  } catch (error: any) {
    logger.error(`❌ ImageKit Delete Error for ${fileId}:`, error);
    throw new Error(`Failed to delete image from ImageKit: ${error.message}`);
  }
}