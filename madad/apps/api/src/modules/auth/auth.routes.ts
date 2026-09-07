import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../../config/db.js';
import { env } from '../../config/env.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { AppError } from '../../lib/errors.js';
import { authenticate } from '../../middleware/auth.js';

const router = Router();
const LoginSchema = z.object({ email: z.string().email(), password: z.string().min(6) });

router.post('/login', asyncHandler(async (req, res) => {
  const input = LoginSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (!user || !user.isActive || !(await bcrypt.compare(input.password, user.passwordHash))) throw new AppError(401, 'Invalid email or password');
  const payload = { sub: user.id, email: user.email, name: user.name, role: user.role };
  const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET as jwt.Secret, { expiresIn: env.JWT_ACCESS_EXPIRES as jwt.SignOptions['expiresIn'] });
  const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET as jwt.Secret, { expiresIn: `${env.JWT_REFRESH_EXPIRES_DAYS}d` as jwt.SignOptions['expiresIn'] });
  res.json({ accessToken, refreshToken, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
}));

router.get('/me', authenticate, asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { id: true, email: true, name: true, role: true, phone: true, isActive: true } });
  res.json(user);
}));

export default router;
