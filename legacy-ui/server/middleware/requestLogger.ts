import type { Request, Response, NextFunction } from 'express';

/**
 * Request logging middleware
 * Logs all incoming requests with method, path, status, and duration.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const timestamp = new Date().toISOString();
    const userId = req.user?.uid || 'anonymous';

    console.log(
      `[REQUEST] ${timestamp} | ${req.method} ${req.path} | ` +
      `Status: ${res.statusCode} | Duration: ${duration}ms | ` +
      `User: ${userId} | IP: ${req.ip || 'unknown'}`
    );
  });

  next();
}
