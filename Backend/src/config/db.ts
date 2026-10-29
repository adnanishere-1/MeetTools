import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";

import { env } from "./env.js";
import { logger } from "../utils/logger.js";

// =====================================
// MongoDB Configuration
// =====================================

mongoose.set("strictQuery", true);

// Prevent duplicate connection attempts.
let connectionPromise: Promise<void> | null = null;

// Prevent duplicate event listeners.
let listenersRegistered = false;

// =====================================
// MongoDB Event Listeners
// =====================================

function registerConnectionListeners(): void {
  if (listenersRegistered) {
    return;
  }

  listenersRegistered = true;

  mongoose.connection.on("connected", () => {
    logger.info(
      "📦 Mongoose successfully connected to MongoDB"
    );
  });

  mongoose.connection.on("error", (error: Error) => {
    logger.error(
      { err: error },
      "❌ MongoDB connection error"
    );
  });

  mongoose.connection.on("disconnected", () => {
    logger.warn(
      "⚠️ MongoDB connection disconnected"
    );
  });

  mongoose.connection.on("reconnected", () => {
    logger.info(
      "🔄 Mongoose reconnected to MongoDB"
    );
  });
}

// =====================================
// Connect to MongoDB
// =====================================

export async function connectDB(): Promise<void> {
  registerConnectionListeners();

  // readyState:
  // 0 = disconnected
  // 1 = connected
  // 2 = connecting
  // 3 = disconnecting

  if (mongoose.connection.readyState === 1) {
    logger.info(
      "✅ MongoDB connection already established"
    );
    return;
  }

  // Reuse an ongoing connection attempt.
  if (connectionPromise) {
    return connectionPromise;
  }

  const mongoUri = env.MONGO_URI;

  if (!mongoUri || !mongoUri.trim()) {
    throw new Error(
      "MONGO_URI is missing. Please check environment configuration."
    );
  }

  logger.info(
    "🔌 Connecting MeetTools to MongoDB..."
  );

  connectionPromise = (async () => {
    try {
      // Wait for any ongoing disconnection to finish.
      if (mongoose.connection.readyState === 3) {
        await mongoose.connection.close();
      }

      await mongoose.connect(mongoUri, {
        // Time allowed to discover a reachable server.
        serverSelectionTimeoutMS: 10000,

        // Maximum inactivity time for socket operations.
        socketTimeoutMS: 45000,

        // Pool configuration.
        maxPoolSize: 20,
        minPoolSize: 0,

        // Idle connections may be closed after 60 seconds.
        maxIdleTimeMS: 60000,

        // Wait up to 10 seconds for an available pool connection.
        waitQueueTimeoutMS: 10000,

        // Enable periodic server monitoring.
        heartbeatFrequencyMS: 10000,

        // Wait for the connection before performing operations.
        bufferCommands: false,
      });

      logger.info(
        "✅ MeetTools MongoDB connection initialized"
      );
    } catch (error: unknown) {
      logger.error(
        { err: error },
        "❌ Failed to initialize MongoDB connection"
      );

      // Let the application entry point decide
      // whether to retry or terminate.
      throw error;
    }
  })();

  try {
    await connectionPromise;
  } finally {
    connectionPromise = null;
  }
}

// =====================================
// Disconnect from MongoDB
// =====================================

export async function disconnectDB(): Promise<void> {
  try {
    // Wait for an ongoing initial connection.
    if (connectionPromise) {
      try {
        await connectionPromise;
      } catch {
        // If connecting failed, still attempt cleanup.
      }
    }

    if (mongoose.connection.readyState === 0) {
      logger.info(
        "ℹ️ MongoDB connection already closed"
      );
      return;
    }

    logger.info(
      "🛑 Closing MeetTools MongoDB connection..."
    );

    await mongoose.disconnect();

    logger.info(
      "✅ MongoDB connection closed gracefully"
    );
  } catch (error: unknown) {
    logger.error(
      { err: error },
      "❌ Error while closing MongoDB connection"
    );

    throw error;
  }
}
