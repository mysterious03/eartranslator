import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  console.error(`[Error] ${statusCode}: ${message}`);
  if (err.stack) {
    console.error(err.stack);
  }

  res.status(statusCode).json({
    error: message,
    code: err.code || 'INTERNAL_ERROR',
  });
}

export function createError(message: string, statusCode = 500, code?: string): AppError {
  const err = new Error(message) as AppError;
  err.statusCode = statusCode;
  err.code = code;
  return err;
}
