import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

export async function connectDB(): Promise<void> {
  try {
    // Strict query setting for Mongoose
    mongoose.set('strictQuery', true);

    // Connection event listeners for monitoring
    mongoose.connection.on('connected', () => {
      logger.info('📦 Mongoose successfully connected to MongoDB');
    });

    mongoose.connection.on('error', (err) => {
      logger.error('❌ Mongoose connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('⚠️ Mongoose connection lost. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('🔄 Mongoose reconnected to MongoDB');
    });

    // Establishing connection with robust options
    await mongoose.connect(env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000, // Agar 5 seconds mein server na mile toh timeout ho jaye
      socketTimeoutMS: 45000,         // Inactivity ke baad socket close ho jaye
    });

  } catch (error) {
    logger.error({ err: error }, '❌ Failed to initialize database connection:');
    process.exit(1);
  }
}

// Graceful shutdown ke liye database connection close karne ka function
export async function disconnectDB(): Promise<void> {
  try {
    await mongoose.connection.close();
    logger.info('🛑 Mongoose connection closed gracefully.');
  } catch (error) {
    logger.error({ err: error }, '❌ Error occurred while closing MongoDB connection:');
    process.exit(1);
  }
}