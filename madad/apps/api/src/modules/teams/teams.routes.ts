import { Router } from 'express';
import { Role, TeamStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../config/db.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { pathId } from '../../lib/params.js';
import { authenticate, authorize } from '../../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', asyncHandler(async (_req, res) => {
  res.json(await prisma.team.findMany({ include: { site: true, zone: true, members: { include: { user: { select: { id: true, name: true, role: true } } } } }, orderBy: { name: 'asc' } }));
}));

router.post('/', authorize(Role.ADMIN, Role.COMMANDER), asyncHandler(async (req, res) => {
  const input = z.object({ code: z.string(), name: z.string(), specialization: z.string(), skills: z.array(z.string()).default([]), siteId: z.string(), zoneId: z.string().nullable().optional(), latitude: z.number(), longitude: z.number(), maxConcurrentJobs: z.number().int().min(1).default(2) }).parse(req.body);
  res.status(201).json(await prisma.team.create({ data: input }));
}));

router.patch('/:id/status', authorize(Role.ADMIN, Role.COMMANDER, Role.DISPATCHER, Role.SUPERVISOR), asyncHandler(async (req, res) => {
  const id = pathId(req.params.id);
  const { status } = z.object({ status: z.nativeEnum(TeamStatus) }).parse(req.body);
  res.json(await prisma.team.update({ where: { id }, data: { status } }));
}));

export default router;
