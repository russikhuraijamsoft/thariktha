import type { Request, Response, NextFunction } from 'express';

/**
 * Global error handler middleware
 * Catches all unhandled errors and returns a standardized error response.
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);

  // Don't leak internal error details in production
  const isDevelopment = process.env.NODE_ENV !== 'production';

  res.status(500).json({
    error: 'INTERNAL_SERVER_ERROR',
    message: isDevelopment ? err.message : 'An internal server error occurred',
    ...(isDevelopment && { stack: err.stack })
  });
}

/**
 * 404 handler for undefined routes
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: 'NOT_FOUND',
    message: `Route ${req.method} ${req.path} not found`
  });
}
