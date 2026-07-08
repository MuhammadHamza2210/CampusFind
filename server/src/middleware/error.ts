import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { ApiError } from '../utils/ApiError';

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ message: 'Route not found' });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: err.flatten().fieldErrors,
    });
  }

  if (err instanceof ApiError) {
    return res
      .status(err.status)
      .json({ message: err.message, details: err.details });
  }

  // Mongoose duplicate key
  if ((err as { code?: number })?.code === 11000) {
    return res.status(409).json({ message: 'That record already exists' });
  }

  console.error('Unhandled error:', err);
  return res.status(500).json({ message: 'Something went wrong' });
}
