// src/middlewares/error.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      status: 'error',
      statusCode: err.statusCode,
      message: err.message,
    });
  } else if (err instanceof SyntaxError && 'status' in err && (err as any).status === 400) {
    res.status(400).json({
      status: 'error',
      statusCode: 400,
      message: 'Invalid JSON in request body',
    });
  } else {
    console.error('Unhandled error:', err);
    res.status(500).json({
      status: 'error',
      statusCode: 500,
      message: 'Internal server error',
    });
  }
};
