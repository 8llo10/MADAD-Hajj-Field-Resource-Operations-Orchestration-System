import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors.js';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) return res.status(400).json({ error: 'ValidationError', details: err.issues });
  if (err instanceof AppError) return res.status(err.statusCode).json({ error: err.message, details: err.details });
  console.error(err);
  return res.status(500).json({ error: 'Internal server error' });
};
