import { Router } from 'express';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { asyncHandler } from '../../lib/async-handler.js';
import { pathId } from '../../lib/params.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { audit } from '../../lib/audit.js';
import { emitOps } from '../../realtime.js';
import { advanceFieldDispatch, completeFieldDispatch, getFieldWorkspace, updateFieldLocation } from './field-operations.service.js';

const router = Router();
router.use(authenticate, authorize(Role.TECHNICIAN, Role.SUPERVISOR));

router.get('/me', asyncHandler(async (req, res) => {
  res.json(await getFieldWorkspace(req.user!.id));
}));

router.patch('/location', asyncHandler(async (req, res) => {
  const input = z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) }).parse(req.body);
  const row = await updateFieldLocation(req.user!.id, input.latitude, input.longitude);
  await audit(req, 'FIELD_LOCATION_UPDATE', 'User', req.user!.id, undefined, row);
  res.json(row);
}));

router.post('/dispatch/:id/start', asyncHandler(async (req, res) => {
  const id = pathId(req.params.id);
  const row = await advanceFieldDispatch(req.user!.id, id, 'DISPATCHED');
  await audit(req, 'FIELD_DISPATCH_START', 'Dispatch', id, undefined, row);
  emitOps('dispatch.updated', row);
  res.json(row);
}));

router.post('/dispatch/:id/arrive', asyncHandler(async (req, res) => {
  const id = pathId(req.params.id);
  const row = await advanceFieldDispatch(req.user!.id, id, 'ARRIVED');
  await audit(req, 'FIELD_DISPATCH_ARRIVE', 'Dispatch', id, undefined, row);
  emitOps('dispatch.updated', row);
  res.json(row);
}));

router.post('/dispatch/:id/resolve', asyncHandler(async (req, res) => {
  const id = pathId(req.params.id);
  const input = z.object({
    summary: z.string().min(10).max(2000),
    actionsTaken: z.array(z.string().min(2).max(300)).min(1).max(20),
    evidenceUrls: z.array(z.string().min(2).max(1000)).min(1).max(10),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional()
  }).parse(req.body);
  const row = await completeFieldDispatch(req.user!.id, id, input);
  await audit(req, 'FIELD_RESOLVE', 'Dispatch', id, undefined, row);
  emitOps('dispatch.completed', row);
  res.json(row);
}));

export default router;
