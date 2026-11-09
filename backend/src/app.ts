import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { apiRouter } from './routes';
import { errorHandler } from './middleware/errorHandler';
import { getHealth } from './controllers/healthController';
import { createRateLimiter } from './middleware/rateLimiter';
import { config } from './config/env';

export const createApp = (): Application => {
  const app = express();

  // Security headers & Cross-Origin Resource Sharing
  app.use(helmet());
  
  const allowedOrigins = [
    config.clientUrl,
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://localhost:4173',
  ];

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (
          config.nodeEnv !== 'production' ||
          allowedOrigins.includes(origin) ||
          /\.vercel\.app$/.test(origin) ||
          /\.onrender\.com$/.test(origin)
        ) {
          return callback(null, true);
        }
        return callback(null, true);
      },
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
    })
  );

  // Global rate limiter: 300 requests per 5 minutes per IP
  const globalLimiter = createRateLimiter({
    windowMs: 5 * 60 * 1000,
    max: 300,
    message: 'Global rate limit exceeded. Please slow down.',
  });
  app.use(globalLimiter);

  // Auth brute-force protection rate limiter: 25 requests per 15 minutes per IP
  const authLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 25,
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
  });
  app.use('/api/v1/auth/login', authLimiter);

  // Body parsers
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Root health check endpoint for reverse-proxy / cloud probes
  app.get('/health', getHealth);

  // Main API v1 routing
  app.use('/api/v1', apiRouter);

  // Root welcome route
  app.get('/', (_req: Request, res: Response) => {
    res.status(200).json({
      name: 'Smart Hall Access & Safety Management System (SHASMS) API',
      status: 'Active',
      docs: '/api/v1/health',
      timestamp: new Date().toISOString(),
    });
  });

  // 404 Route handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      message: `Route ${req.method} ${req.originalUrl} not found on this server.`,
    });
  });

  // Centralized Error handler
  app.use(errorHandler);

  return app;
};
