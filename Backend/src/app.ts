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

// =====================================
// Application
// =====================================

const app: Application = express();

const isProduction = process.env.NODE_ENV === "production";

// Render reverse proxy configuration.
app.set("trust proxy", 1);

// =====================================
// CORS Configuration
// =====================================

const configuredOrigins = [
  process.env.FRONTEND_URL,
  process.env.CLIENT_URL,
]
  .filter((value): value is string => Boolean(value))
  .flatMap((value) => value.split(","))
  .map((value) => value.trim().replace(/\/+$/, ""))
  .filter(Boolean);

if (!isProduction) {
  configuredOrigins.push("http://localhost:3000");
}

if (isProduction && configuredOrigins.length === 0) {
  logger.error(
    "No frontend origin configured. Set FRONTEND_URL in production."
  );
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server requests without Origin.
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin = origin.trim().replace(/\/+$/, "");

      if (configuredOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      logger.warn(`CORS blocked origin: ${origin}`);

      return callback(new Error("Not allowed by CORS"));
    },

    credentials: true,

    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Accept",
      "X-Requested-With",
      // FIXED: Role-selection header for dual sessions.
      "X-Active-Role",
    ],

    optionsSuccessStatus: 204,
  })
);

// =====================================
// Security Headers
// =====================================

app.use(
  helmet({
    contentSecurityPolicy: isProduction ? undefined : false,
  })
);

// =====================================
// Request Logging
// =====================================

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

// =====================================
// Request Body Parsing
// =====================================

// Keep 10 MB compatibility with existing API.
app.use(
  express.json({
    limit: "10mb",
    strict: true,
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb",
    parameterLimit: 100,
  })
);

// =====================================
// Cookie Parsing
// =====================================

app.use(cookieParser());

// =====================================
// Development-only Auth Debugging
// =====================================

if (!isProduction) {
  app.use("/api/v1/auth", (req, _res, next) => {
    if (req.method === "POST") {
      logger.info(
        {
          path: req.path,
          contentType: req.headers["content-type"],
          contentLength: req.headers["content-length"],
          bodyExists:
            req.body !== undefined &&
            req.body !== null,
          bodyKeys:
            req.body &&
            typeof req.body === "object" &&
            !Array.isArray(req.body)
              ? Object.keys(req.body)
              : [],
        },
        "Auth request debug"
      );
    }

    next();
  });
}

// =====================================
// API Routes
// =====================================

app.use("/api/v1/auth", authroutes);
app.use("/api/v1/users", userroutes);
app.use("/api/v1/images", imageroutes);
app.use("/api/v1/jobs", jobroutes);
app.use("/api/v1/presets", presetroutes);
app.use("/api/v1/activity-logs", activitylogroutes);
app.use("/api/v1/admin", adminroutes);

// =====================================
// Health Check
// =====================================

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

// =====================================
// 404 Handler
// =====================================

app.use((req, res) => {
  logger.warn(
    `404 Not Found: ${req.method} ${req.originalUrl}`
  );

  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: "The requested endpoint does not exist.",
    },
  });
});

// =====================================
// Global Error Handler
// =====================================

app.use(errorHandler);

export default app;