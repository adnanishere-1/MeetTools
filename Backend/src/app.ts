
import express, {
  type Application,
  type Request,
  type Response,
} from "express";

import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";

import { errorHandler } from "./middlewares/errorHandler.middleware.js";
import { logger } from "./utils/logger.js";

import authroutes from "./routes/auth.routes.js";
import userroutes from "./routes/user.routes.js";
import imageroutes from "./routes/image.routes.js";
import jobroutes from "./routes/job.routes.js";
import presetroutes from "./routes/preset.routes.js";
import activitylogroutes from "./routes/activitylog.routes.js";
import adminroutes from "./routes/admin.routes.js";

const app: Application = express();

const isProduction = process.env.NODE_ENV === "production";

// Support multiple frontend URLs separated by commas.
const configuredOrigins = [
  process.env.FRONTEND_URL,
  process.env.CLIENT_URL,
]
  .filter((value): value is string => Boolean(value))
  .flatMap((value) => value.split(","))
  .map((value) => value.trim().replace(/\/$/, ""))
  .filter(Boolean);

if (!isProduction) {
  configuredOrigins.push("http://localhost:3000");
}

if (isProduction && configuredOrigins.length === 0) {
  logger.warn(
    "No frontend origin configured. Set FRONTEND_URL in production."
  );
}

app.use(helmet());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without an Origin header, such as server-to-server calls.
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin = origin.replace(/\/$/, "");

      if (configuredOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      logger.warn(`CORS blocked origin: ${origin}`);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

if (isProduction) {
  app.use(
    morgan("combined", {
      stream: {
        write: (message) => logger.info(message.trim()),
      },
    })
  );
} else {
  app.use(morgan("dev"));
}

// Body parsers must run before routes.
app.use(express.json({ limit: "10mb" }));

app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb",
  })
);

app.use(cookieParser());

// Development-only auth request debugging.
if (!isProduction) {
  app.use("/api/v1/auth", (req, _res, next) => {
    if (req.method === "POST") {
      logger.info({
        path: req.path,
        contentType: req.headers["content-type"],
        contentLength: req.headers["content-length"],
        bodyExists: req.body !== undefined && req.body !== null,
        bodyKeys:
          req.body &&
          typeof req.body === "object" &&
          !Array.isArray(req.body)
            ? Object.keys(req.body)
            : [],
      }, "Auth request debug");
    }

    next();
  });
}

// API routes
app.use("/api/v1/auth", authroutes);
app.use("/api/v1/users", userroutes);
app.use("/api/v1/images", imageroutes);
app.use("/api/v1/jobs", jobroutes);
app.use("/api/v1/presets", presetroutes);
app.use("/api/v1/activity-logs", activitylogroutes);
app.use("/api/v1/admin", adminroutes);

// Render health check endpoint
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req, res) => {
  logger.warn(`404 Not Found: ${req.method} ${req.originalUrl}`);

  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: "The requested endpoint does not exist.",
    },
  });
});

// Global error handler
app.use(errorHandler);

export default app;
