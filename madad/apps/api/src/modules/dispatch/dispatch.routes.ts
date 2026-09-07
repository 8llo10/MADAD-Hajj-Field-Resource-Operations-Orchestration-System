import { Router } from 'express';
import { DispatchStatus, IncidentStatus, ResourceStatus, Role, TeamStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../config/db.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { pathId } from '../../lib/params.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { rankTeamsForIncident, proposeBestDispatch } from './dispatch.service.js';
import { audit } from '../../lib/audit.js';
import { AppError } from '../../lib/errors.js';
import { emitOps } from '../../realtime.js';

const router = Router();
router.use(authenticate);

router.get('/rank/:incidentId', asyncHandler(async (req, res) => {
  const incidentId = pathId(req.params.incidentId, 'incidentId');
  res.json(await rankTeamsForIncident(incidentId));
}));

router.post('/auto/:incidentId', authorize(Role.ADMIN, Role.COMMANDER, Role.DISPATCHER), asyncHandler(async (req, res) => {
  const incidentId = pathId(req.params.incidentId, 'incidentId');
  const row = await proposeBestDispatch(incidentId);
  await audit(req, 'AUTO_PROPOSE', 'Dispatch', row.id, undefined, row);
  emitOps('dispatch.proposed', row);
  res.status(201).json(row);
}));

router.post('/manual/:incidentId', authorize(Role.ADMIN, Role.COMMANDER, Role.DISPATCHER), asyncHandler(async (req, res) => {
  const incidentId = pathId(req.params.incidentId, 'incidentId');
  const { teamId } = z.object({ teamId: z.string().min(1) }).parse(req.body);
  const incident = await prisma.incident.findUnique({ where: { id: incidentId } });
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!incident || !team) throw new AppError(404, 'Incident or team not found');
  const candidate = (await rankTeamsForIncident(incidentId)).find(x => x.team.id === teamId);
  if (!candidate) throw new AppError(404, 'Team ranking not found');
  const row = await prisma.dispatch.create({
    data: { incidentId, teamId, score: candidate.score, distanceKm: candidate.distanceKm, etaMinutes: candidate.etaMinutes, explanation: { manual: true, breakdown: candidate.breakdown, reasons: candidate.reasons } },
    include: { incident: true, team: true }
  });
  await audit(req, 'MANUAL_PROPOSE', 'Dispatch', row.id, undefined, row);
  emitOps('dispatch.proposed', row);
  res.status(201).json(row);
}));

router.post('/:id/accept', authorize(Role.ADMIN, Role.COMMANDER, Role.DISPATCHER, Role.SUPERVISOR), asyncHandler(async (req, res) => {
  const id = pathId(req.params.id);
  const { resourceIds } = z.object({ resourceIds: z.array(z.string()).default([]) }).parse(req.body);
  const d = await prisma.dispatch.findUnique({ where: { id }, include: { incident: true } });
  if (!d) throw new AppError(404, 'Dispatch not found');
  const row = await prisma.$transaction(async tx => {
    if (resourceIds.length) {
      const resources = await tx.resource.findMany({ where: { id: { in: resourceIds }, status: ResourceStatus.AVAILABLE } });
      if (resources.length !== resourceIds.length) throw new AppError(409, 'One or more resources are unavailable');
      await tx.dispatchResource.createMany({ data: resourceIds.map(resourceId => ({ dispatchId: id, resourceId })), skipDuplicates: true });
      await tx.resource.updateMany({ where: { id: { in: resourceIds } }, data: { status: ResourceStatus.IN_USE } });
    }
    await tx.team.update({ where: { id: d.teamId }, data: { status: TeamStatus.BUSY, activeJobs: { increment: 1 } } });
    await tx.incident.update({ where: { id: d.incidentId }, data: { status: IncidentStatus.ASSIGNED, assignedAt: new Date() } });
    await tx.incidentStatusEvent.create({ data: { incidentId: d.incidentId, fromStatus: d.incident.status, toStatus: IncidentStatus.ASSIGNED, actorId: req.user!.id, note: 'Dispatch accepted' } });
    return tx.dispatch.update({ where: { id }, data: { status: DispatchStatus.ACCEPTED, acceptedAt: new Date() }, include: { team: true, incident: true, resources: { include: { resource: true } } } });
  });
  await audit(req, 'ACCEPT', 'Dispatch', id, d, row);
  emitOps('dispatch.accepted', row);
  res.json(row);
}));

router.patch('/:id/state', authorize(Role.ADMIN, Role.COMMANDER, Role.DISPATCHER, Role.SUPERVISOR, Role.TECHNICIAN), asyncHandler(async (req, res) => {
  const id = pathId(req.params.id);
  const { status } = z.object({ status: z.enum(['DISPATCHED', 'ARRIVED', 'CANCELLED']) }).parse(req.body);
  const d = await prisma.dispatch.findUnique({ where: { id }, include: { incident: true } });
  if (!d) throw new AppError(404, 'Dispatch not found');
  const incidentStatus = status === 'DISPATCHED' ? IncidentStatus.EN_ROUTE : status === 'ARRIVED' ? IncidentStatus.ON_SITE : d.incident.status;
  const data = status === 'DISPATCHED' ? { status: DispatchStatus.DISPATCHED, dispatchedAt: new Date() } : status === 'ARRIVED' ? { status: DispatchStatus.ARRIVED, arrivedAt: new Date() } : { status: DispatchStatus.CANCELLED };
  const row = await prisma.$transaction(async tx => {
    const updated = await tx.dispatch.update({ where: { id }, data, include: { incident: true, team: true } });
    if (status !== 'CANCELLED') {
      await tx.incident.update({ where: { id: d.incidentId }, data: { status: incidentStatus } });
      await tx.incidentStatusEvent.create({ data: { incidentId: d.incidentId, fromStatus: d.incident.status, toStatus: incidentStatus, actorId: req.user!.id, note: `Dispatch ${status.toLowerCase()}` } });
    }
    return updated;
  });
  emitOps('dispatch.updated', row);
  res.json(row);
}));

router.post('/:id/complete', authorize(Role.ADMIN, Role.COMMANDER, Role.DISPATCHER, Role.SUPERVISOR, Role.TECHNICIAN), asyncHandler(async (req, res) => {
  const id = pathId(req.params.id);
  const d = await prisma.dispatch.findUnique({ where: { id }, include: { resources: true, incident: true } });
  if (!d) throw new AppError(404, 'Dispatch not found');
  const row = await prisma.$transaction(async tx => {
    const resourceIds = d.resources.map(x => x.resourceId);
    if (resourceIds.length) await tx.resource.updateMany({ where: { id: { in: resourceIds } }, data: { status: ResourceStatus.AVAILABLE } });
    await tx.team.update({ where: { id: d.teamId }, data: { activeJobs: { decrement: 1 }, status: TeamStatus.AVAILABLE } });
    await tx.incident.update({ where: { id: d.incidentId }, data: { status: IncidentStatus.RESOLVED, resolvedAt: new Date() } });
    await tx.incidentStatusEvent.create({ data: { incidentId: d.incidentId, fromStatus: d.incident.status, toStatus: IncidentStatus.RESOLVED, actorId: req.user!.id, note: 'Dispatch completed' } });
    return tx.dispatch.update({ where: { id }, data: { status: DispatchStatus.COMPLETED, completedAt: new Date() }, include: { team: true, incident: true } });
  });
  await audit(req, 'COMPLETE', 'Dispatch', id, d, row);
  emitOps('dispatch.completed', row);
  res.json(row);
}));

export default router;
