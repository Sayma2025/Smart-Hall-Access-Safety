import { Request, Response, NextFunction } from 'express';

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
}

export const createRateLimiter = (options: RateLimitOptions) => {
  const hits = new Map<string, { count: number; resetTime: number }>();

  // Periodic cleanup
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, value] of hits.entries()) {
      if (now > value.resetTime) {
        hits.delete(key);
      }
    }
  }, 60000);

  if (timer.unref) {
    timer.unref();
  }

  return (req: Request, res: Response, next: NextFunction): void => {
    // In test environment, skip to avoid slowing automated suites
    if (process.env.NODE_ENV === 'test') {
      next();
      return;
    }

    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    const record = hits.get(ip);
    if (!record || now > record.resetTime) {
      hits.set(ip, { count: 1, resetTime: now + options.windowMs });
      next();
      return;
    }

    record.count++;
    if (record.count > options.max) {
      const retryAfterSec = Math.ceil((record.resetTime - now) / 1000);
      res.set('Retry-After', String(retryAfterSec));
      res.status(429).json({
        success: false,
        message: options.message || 'Too many requests from this IP. Please try again later.',
        retryAfter: retryAfterSec,
      });
      return;
    }

    next();
  };
};

