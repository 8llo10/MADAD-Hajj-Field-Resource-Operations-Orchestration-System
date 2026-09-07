import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import type { Role } from '@prisma/client';
import { env } from '../config.js';

type TokenPayload = { sub: string; email: string; name: string; role: Role };
export const authenticate: RequestHandler = (req,res,next) => {
  const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : undefined;
  if (!token) return void res.status(401).json({ message: 'Authentication required' });
  try {
    const p = jwt.verify(token, env.JWT_ACCESS_SECRET) as TokenPayload;
    req.user = { id:p.sub, email:p.email, name:p.name, role:p.role };
    next();
  } catch { return void res.status(401).json({ message: 'Invalid or expired token' }); }
};
export const authorize = (...roles: Role[]): RequestHandler => (req,res,next) => {
  if (!req.user || !roles.includes(req.user.role)) return void res.status(403).json({ message: 'Forbidden' });
  next();
};
