import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors.js';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) return void res.status(400).json({ message: 'Validation failed', issues: err.issues });
  if (err instanceof AppError) return void res.status(err.status).json({ message: err.message, details: err.details });
  console.error(err);
  return void res.status(500).json({ message: 'Internal server error' });
};
