import { Router } from 'express';
import { ResourceStatus, ResourceType, Role } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../config/db.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { pathId } from '../../lib/params.js';
import { authenticate, authorize } from '../../middleware/auth.js';

const router = Router(); router.use(authenticate);
router.get('/', asyncHandler(async (_req, res) => res.json(await prisma.resource.findMany({ include: { site: true }, orderBy: { name: 'asc' } }))));
router.post('/', authorize(Role.ADMIN, Role.COMMANDER), asyncHandler(async (req, res) => {
  const input = z.object({ assetTag: z.string(), name: z.string(), type: z.nativeEnum(ResourceType), siteId: z.string(), latitude: z.number().nullable().optional(), longitude: z.number().nullable().optional(), capabilities: z.array(z.string()).default([]) }).parse(req.body);
  res.status(201).json(await prisma.resource.create({ data: input }));
}));
router.patch('/:id/status', authorize(Role.ADMIN, Role.COMMANDER, Role.SUPERVISOR), asyncHandler(async (req, res) => {
  const id = pathId(req.params.id);
  const { status } = z.object({ status: z.nativeEnum(ResourceStatus) }).parse(req.body);
  res.json(await prisma.resource.update({ where: { id }, data: { status } }));
}));
export default router;
