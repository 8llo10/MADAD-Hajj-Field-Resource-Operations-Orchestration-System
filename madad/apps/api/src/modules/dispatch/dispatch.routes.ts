import { Router } from 'express';
import { AssignmentMode, DispatchStatus, IncidentStatus, ResourceStatus, Role, TeamStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../config/db.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { pathId } from '../../lib/params.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { rankTeamsForIncident } from './dispatch.service.js';
import {
  acceptAssignment,
  assignBestImmediately,
  assignTeamImmediately,
  proposeAssignment,
  proposeBestAssignment,
  reassignIncident
} from './assignment.service.js';
import { audit } from '../../lib/audit.js';
import { AppError } from '../../lib/errors.js';
import { emitOps } from '../../realtime.js';

const router = Router();
router.use(authenticate);

const FIELD_TEAM_ROLES = new Set<Role>([Role.SUPERVISOR]);
const ACTIVE_COMMITTED_DISPATCH_STATES = new Set<DispatchStatus>([
  DispatchStatus.ACCEPTED,
  DispatchStatus.DISPATCHED,
  DispatchStatus.ARRIVED
]);

router.get('/rank/:incidentId', asyncHandler(async (req, res) => {
  const incidentId = pathId(req.params.incidentId, 'incidentId');
  res.json(await rankTeamsForIncident(incidentId));
}));

router.post('/auto/:incidentId', authorize(Role.ADMIN, Role.COMMANDER, Role.DISPATCHER), asyncHandler(async (req, res) => {
  const incidentId = pathId(req.params.incidentId, 'incidentId');
  const row = await proposeBestAssignment(incidentId, AssignmentMode.AI, req.user!.id);
  await audit(req, 'AI_PROPOSE', 'Dispatch', row.id, undefined, row);
  emitOps('dispatch.proposed', row);
  res.status(201).json(row);
}));

router.post('/manual/:incidentId', authorize(Role.ADMIN, Role.COMMANDER, Role.DISPATCHER), asyncHandler(async (req, res) => {
  const incidentId = pathId(req.params.incidentId, 'incidentId');
  const { teamId } = z.object({ teamId: z.string().min(1) }).parse(req.body);
  const row = await proposeAssignment(incidentId, teamId, AssignmentMode.MANUAL, req.user!.id);
  await audit(req, 'MANUAL_PROPOSE', 'Dispatch', row.id, undefined, row);
  emitOps('dispatch.proposed', row);
  res.status(201).json(row);
}));

router.post('/assign/manual/:incidentId', authorize(Role.ADMIN, Role.COMMANDER, Role.DISPATCHER), asyncHandler(async (req, res) => {
  const incidentId = pathId(req.params.incidentId, 'incidentId');
  const { teamId } = z.object({ teamId: z.string().min(1) }).parse(req.body);
  const row = await assignTeamImmediately(incidentId, teamId, AssignmentMode.MANUAL, req.user!.id);
  await audit(req, 'MANUAL_ASSIGN', 'Dispatch', row.id, undefined, row);
  emitOps('dispatch.assigned', row);
  res.status(201).json(row);
}));

router.post('/assign/ai/:incidentId', authorize(Role.ADMIN, Role.COMMANDER, Role.DISPATCHER), asyncHandler(async (req, res) => {
  const incidentId = pathId(req.params.incidentId, 'incidentId');
  const row = await assignBestImmediately(incidentId, AssignmentMode.AI, req.user!.id);
  await audit(req, 'AI_ASSIGN', 'Dispatch', row.id, undefined, row);
  emitOps('dispatch.assigned', row);
  res.status(201).json(row);
}));

router.post('/reassign/:incidentId', authorize(Role.ADMIN, Role.COMMANDER, Role.DISPATCHER), asyncHandler(async (req, res) => {
  const incidentId = pathId(req.params.incidentId, 'incidentId');
  const input = z.object({
    teamId: z.string().min(1),
    mode: z.nativeEnum(AssignmentMode).default(AssignmentMode.MANUAL)
  }).parse(req.body);
  if (input.mode === AssignmentMode.AUTO_TIMEOUT) throw new AppError(400, 'AUTO_TIMEOUT is reserved for the scheduler');
  const before = await prisma.incident.findUnique({ where: { id: incidentId }, include: { dispatches: true } });
  const row = await reassignIncident(incidentId, input.teamId, req.user!.id, input.mode);
  await audit(req, 'REASSIGN', 'Incident', incidentId, before, row);
  emitOps('dispatch.reassigned', row);
  res.status(201).json(row);
}));

router.post('/:id/accept', authorize(Role.ADMIN, Role.COMMANDER, Role.DISPATCHER, Role.SUPERVISOR), asyncHandler(async (req, res) => {
  const id = pathId(req.params.id);
  const { resourceIds } = z.object({ resourceIds: z.array(z.string()).default([]) }).parse(req.body);
  const before = await prisma.dispatch.findUnique({ where: { id } });
  const row = await acceptAssignment(id, req.user!.id, resourceIds);
  await audit(req, 'ACCEPT', 'Dispatch', id, before, row);
  emitOps('dispatch.accepted', row);
  res.json(row);
}));

router.patch('/:id/state', authorize(Role.ADMIN, Role.COMMANDER, Role.DISPATCHER, Role.SUPERVISOR), asyncHandler(async (req, res) => {
  const id = pathId(req.params.id);
  const { status } = z.object({ status: z.enum(['DISPATCHED', 'ARRIVED', 'CANCELLED']) }).parse(req.body);
  const d = await prisma.dispatch.findUnique({ where: { id }, include: { incident: true, resources: true } });
  if (!d) throw new AppError(404, 'Dispatch not found');

  if (FIELD_TEAM_ROLES.has(req.user!.role)) {
    const membership = await prisma.teamMember.findFirst({ where: { teamId: d.teamId, userId: req.user!.id } });
    if (!membership) throw new AppError(403, 'You can only update dispatches assigned to your team');
  }

  const incidentStatus = status === 'DISPATCHED' ? IncidentStatus.EN_ROUTE : status === 'ARRIVED' ? IncidentStatus.ON_SITE : d.incident.status;
  const data = status === 'DISPATCHED'
    ? { status: DispatchStatus.DISPATCHED, dispatchedAt: new Date() }
    : status === 'ARRIVED'
      ? { status: DispatchStatus.ARRIVED, arrivedAt: new Date() }
      : { status: DispatchStatus.CANCELLED };

  const row = await prisma.$transaction(async tx => {
    const updated = await tx.dispatch.update({ where: { id }, data, include: { incident: true, team: true } });

    if (status === 'CANCELLED') {
      const resourceIds = d.resources.map(item => item.resourceId);
      if (resourceIds.length) await tx.resource.updateMany({ where: { id: { in: resourceIds } }, data: { status: ResourceStatus.AVAILABLE } });
      if (ACTIVE_COMMITTED_DISPATCH_STATES.has(d.status)) {
        const team = await tx.team.findUnique({ where: { id: d.teamId } });
        if (team) {
          const nextJobs = Math.max(0, team.activeJobs - 1);
          await tx.team.update({ where: { id: d.teamId }, data: { activeJobs: nextJobs, status: nextJobs ? TeamStatus.BUSY : TeamStatus.AVAILABLE } });
        }
      }
    } else {
      await tx.incident.update({ where: { id: d.incidentId }, data: { status: incidentStatus } });
      await tx.incidentStatusEvent.create({ data: { incidentId: d.incidentId, fromStatus: d.incident.status, toStatus: incidentStatus, actorId: req.user!.id, note: `Dispatch ${status.toLowerCase()}` } });
    }

    return updated;
  });

  emitOps('dispatch.updated', row);
  res.json(row);
}));

router.post('/:id/complete', authorize(Role.ADMIN, Role.COMMANDER, Role.SUPERVISOR), asyncHandler(async (req, res) => {
  const id = pathId(req.params.id);
  const { note } = z.object({ note: z.string().max(1000).optional() }).parse(req.body ?? {});
  const d = await prisma.dispatch.findUnique({ where: { id }, include: { resources: true, incident: true, team: true } });
  if (!d) throw new AppError(404, 'Dispatch not found');
  if (!ACTIVE_COMMITTED_DISPATCH_STATES.has(d.status)) {
    throw new AppError(409, 'Only an active assigned dispatch can be completed');
  }

  if (FIELD_TEAM_ROLES.has(req.user!.role)) {
    const membership = await prisma.teamMember.findFirst({ where: { teamId: d.teamId, userId: req.user!.id } });
    if (!membership) throw new AppError(403, 'Only a member of the assigned team can resolve this incident');
  }

  const row = await prisma.$transaction(async tx => {
    const resourceIds = d.resources.map(x => x.resourceId);
    if (resourceIds.length) await tx.resource.updateMany({ where: { id: { in: resourceIds } }, data: { status: ResourceStatus.AVAILABLE } });

    const team = await tx.team.findUnique({ where: { id: d.teamId } });
    if (team) {
      const nextJobs = Math.max(0, team.activeJobs - 1);
      await tx.team.update({ where: { id: d.teamId }, data: { activeJobs: nextJobs, status: nextJobs ? TeamStatus.BUSY : TeamStatus.AVAILABLE } });
    }

    await tx.incident.update({
      where: { id: d.incidentId },
      data: {
        status: IncidentStatus.RESOLVED,
        resolvedAt: new Date(),
        resolvedByUserId: req.user!.id,
        resolvedByTeamId: d.teamId,
        resolutionNote: note ?? null
      }
    });

    await tx.incidentStatusEvent.create({
      data: {
        incidentId: d.incidentId,
        fromStatus: d.incident.status,
        toStatus: IncidentStatus.RESOLVED,
        actorId: req.user!.id,
        note: note ? `Resolved: ${note}` : `Resolved by ${req.user!.id}`
      }
    });

    return tx.dispatch.update({
      where: { id },
      data: { status: DispatchStatus.COMPLETED, completedAt: new Date() },
      include: { team: true, incident: { include: { resolvedByUser: { select: { id: true, name: true } } } } }
    });
  });

  await audit(req, 'COMPLETE', 'Dispatch', id, d, row);
  emitOps('dispatch.completed', row);
  res.json(row);
}));

export default router;