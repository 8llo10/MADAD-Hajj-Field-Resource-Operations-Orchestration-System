import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import type { Role } from '@prisma/client';
import { env } from '../config/env.js';
import { AppError } from '../lib/errors.js';

type TokenPayload = { sub: string; email: string; name: string; role: Role };

export const authenticate: RequestHandler = (req, _res, next) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return next(new AppError(401, 'Authentication required'));
  try {
    const p = jwt.verify(token, env.JWT_ACCESS_SECRET) as TokenPayload;
    req.user = { id: p.sub, email: p.email, name: p.name, role: p.role };
    next();
  } catch {
    next(new AppError(401, 'Invalid or expired access token'));
  }
};

export const authorize = (...roles: Role[]): RequestHandler => (req, _res, next) => {
  if (!req.user) return next(new AppError(401, 'Authentication required'));
  if (!roles.includes(req.user.role)) return next(new AppError(403, 'Insufficient permissions'));
  next();
};
