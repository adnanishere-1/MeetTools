import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
//import { errorHandler } from './middlewares/error.middleware.js';
//import { logger } from './utils/logger.js';

const app: Application = express();

// Security and utility middlewares
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
  })
);

// Logging HTTP requests
if (process.env.NODE_ENV === 'production') {
  app.use(
    morgan('combined', {
      stream: { write: (message) => console.log(message.trim()) },
    })
  );
} else {
  app.use(morgan('dev'));
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Base API Routes
//app.use('/api', routes);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// 404 Not Found Handler
app.use((req: Request, res: Response, next: NextFunction) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'The requested endpoint does not exist.',
    },
  });
});

// Global Error Handler Middleware
//app.use(errorHandler);

export default app;