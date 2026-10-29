
import express, {
  Application,
  Request,
  Response,
  NextFunction,
} from 'express';

import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import { errorHandler } from './middlewares/errorHandler.middleware.js';
import { logger } from './utils/logger.js';

import authroutes from './routes/auth.routes.js';
import userroutes from './routes/user.routes.js';
import imageroutes from './routes/image.routes.js';
import jobroutes from './routes/job.routes.js';
import presetroutes from './routes/preset.routes.js';
import activitylogroutes from './routes/activitylog.routes.js';
import adminroutes from './routes/admin.routes.js';

const app: Application = express();

// Security middlewares
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin:
      process.env.CLIENT_URL ||
      'http://localhost:3000',
    credentials: true,
  })
);

// HTTP request logging
if (process.env.NODE_ENV === 'production') {
  app.use(
    morgan('combined', {
      stream: {
        write: (message) =>
          logger.info(message.trim()),
      },
    })
  );
} else {
  app.use(morgan('dev'));
}

// Request body parsers
app.use(express.json({ limit: '10mb' }));

app.use(
  express.urlencoded({
    extended: true,
    limit: '10mb',
  })
);

// IMPORTANT: Parse HttpOnly authentication cookies
// Must be registered before API routes
app.use(cookieParser());

// Base API Routes
app.use('/api/v1/auth', authroutes);
app.use('/api/v1/users', userroutes);
app.use('/api/v1/images', imageroutes);
app.use('/api/v1/jobs', jobroutes);
app.use('/api/v1/presets', presetroutes);
app.use('/api/v1/activity-logs', activitylogroutes);
app.use('/api/v1/admin', adminroutes);

// Health check endpoint
app.get(
  '/health',
  (req: Request, res: Response) => {
    logger.info('Health check status requested');

    res.status(200).json({
      success: true,
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  }
);

// 404 Not Found Handler
app.use(
  (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    logger.warn(
      `404 Not Found: ${req.method} ${req.originalUrl}`
    );

    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message:
          'The requested endpoint does not exist.',
      },
    });
  }
);

// Global Error Handler
app.use(errorHandler);

export default app;
