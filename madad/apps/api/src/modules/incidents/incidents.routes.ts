import { Router } from 'express';
import { IncidentSeverity, IncidentStatus, Role } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../config/db.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { pathId } from '../../lib/params.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { audit } from '../../lib/audit.js';
import { AppError } from '../../lib/errors.js';
import { emitOps } from '../../realtime.js';

const router = Router();
router.use(authenticate);

const REOPENABLE_INCIDENT_STATES = new Set<IncidentStatus>([
  IncidentStatus.RESOLVED,
  IncidentStatus.CLOSED
]);

const DISPATCH_MANAGED_INCIDENT_STATES = new Set<IncidentStatus>([
  IncidentStatus.ASSIGNED,
  IncidentStatus.EN_ROUTE,
  IncidentStatus.ON_SITE,
  IncidentStatus.RESOLVED,
  IncidentStatus.REOPENED
]);

const INCIDENT_CLOSING_ROLES = new Set<Role>([
  Role.ADMIN,
  Role.COMMANDER,
  Role.DISPATCHER
]);

const CreateIncidentSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(3),
  category: z.string().min(2),
  requiredSkills: z.array(z.string()).default([]),
  severity: z.nativeEnum(IncidentSeverity),
  siteId: z.string().min(1),
  zoneId: z.string().nullable().optional(),
  latitude: z.number(),
  longitude: z.number(),
  slaMinutes: z.number().int().positive(),
  autoAssignmentEnabled: z.boolean().default(true),
  autoAssignAfterMinutes: z.number().int().min(1).max(120).optional()
});

const StatusSchema = z.object({ status: z.nativeEnum(IncidentStatus), note: z.string().optional() });

function autoAssignmentDelay(severity: IncidentSeverity, requested?: number) {
  if (requested) return requested;
  if (severity === IncidentSeverity.CRITICAL) return 2;
  if (severity === IncidentSeverity.HIGH) return 5;
  if (severity === IncidentSeverity.MEDIUM) return 10;
  return 15;
}

router.get('/', asyncHandler(async (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status as IncidentStatus : undefined;
  const severity = typeof req.query.severity === 'string' ? req.query.severity as IncidentSeverity : undefined;
  const rows = await prisma.incident.findMany({
    where: { status, severity },
    include: {
      site: true,
      zone: true,
      resolvedByUser: { select: { id: true, name: true } },
      resolvedByTeam: { select: { id: true, code: true, name: true } },
      dispatches: {
        include: { team: true, assignedBy: { select: { id: true, name: true } } },
        orderBy: { proposedAt: 'desc' },
        take: 5
      }
    },
    orderBy: [{ severity: 'desc' }, { openedAt: 'desc' }]
  });
  res.json(rows);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const id = pathId(req.params.id);
  const row = await prisma.incident.findUnique({
    where: { id },
    include: {
      site: true,
      zone: true,
      resolvedByUser: { select: { id: true, name: true, role: true } },
      resolvedByTeam: { select: { id: true, code: true, name: true } },
      statusEvents: { orderBy: { createdAt: 'desc' } },
      dispatches: {
        include: {
          team: true,
          assignedBy: { select: { id: true, name: true } },
          resources: { include: { resource: true } }
        },
        orderBy: { proposedAt: 'desc' }
      }
    }
  });
  if (!row) throw new AppError(404, 'Incident not found');
  res.json(row);
}));

router.post('/', authorize(Role.ADMIN, Role.COMMANDER, Role.DISPATCHER, Role.SUPERVISOR), asyncHandler(async (req, res) => {
  const input = CreateIncidentSchema.parse(req.body);
  const code = `INC-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
  const delayMinutes = autoAssignmentDelay(input.severity, input.autoAssignAfterMinutes);
  const autoAssignAt = input.autoAssignmentEnabled
    ? new Date(Date.now() + delayMinutes * 60_000)
    : null;

  const row = await prisma.incident.create({
    data: {
      title: input.title,
      description: input.description,
      category: input.category,
      requiredSkills: input.requiredSkills,
      severity: input.severity,
      siteId: input.siteId,
      zoneId: input.zoneId,
      latitude: input.latitude,
      longitude: input.longitude,
      slaMinutes: input.slaMinutes,
      autoAssignmentEnabled: input.autoAssignmentEnabled,
      autoAssignAt,
      code,
      status: IncidentStatus.OPEN
    }
  });

  await prisma.incidentStatusEvent.create({
    data: { incidentId: row.id, toStatus: IncidentStatus.OPEN, actorId: req.user!.id, note: 'Incident created' }
  });
  await audit(req, 'CREATE', 'Incident', row.id, undefined, row);
  emitOps('incident.created', row);
  res.status(201).json(row);
}));

router.post('/:id/reopen', authorize(Role.ADMIN, Role.COMMANDER, Role.DISPATCHER, Role.SUPERVISOR), asyncHandler(async (req, res) => {
  const id = pathId(req.params.id);
  const { note } = z.object({ note: z.string().min(2).max(1000) }).parse(req.body);
  const current = await prisma.incident.findUnique({ where: { id } });
  if (!current) throw new AppError(404, 'Incident not found');
  if (!REOPENABLE_INCIDENT_STATES.has(current.status)) {
    throw new AppError(409, 'Only resolved or closed incidents can be reopened');
  }

  const delayMinutes = autoAssignmentDelay(current.severity);
  const now = new Date();
  const row = await prisma.$transaction(async tx => {
    const updated = await tx.incident.update({
      where: { id },
      data: {
        status: IncidentStatus.REOPENED,
        reopenCount: { increment: 1 },
        lastReopenedAt: now,
        assignedAt: null,
        resolvedAt: null,
        closedAt: null,
        resolvedByUserId: null,
        resolvedByTeamId: null,
        resolutionNote: null,
        autoAssignAt: current.autoAssignmentEnabled ? new Date(now.getTime() + delayMinutes * 60_000) : null
      }
    });
    await tx.incidentStatusEvent.create({
      data: { incidentId: id, fromStatus: current.status, toStatus: IncidentStatus.REOPENED, actorId: req.user!.id, note }
    });
    return updated;
  });

  await audit(req, 'REOPEN', 'Incident', id, current, row);
  emitOps('incident.reopened', row);
  res.json(row);
}));

router.patch('/:id/status', authorize(Role.ADMIN, Role.COMMANDER, Role.DISPATCHER, Role.SUPERVISOR), asyncHandler(async (req, res) => {
  const id = pathId(req.params.id);
  const input = StatusSchema.parse(req.body);
  const current = await prisma.incident.findUnique({ where: { id } });
  if (!current) throw new AppError(404, 'Incident not found');

  if (DISPATCH_MANAGED_INCIDENT_STATES.has(input.status)) {
    throw new AppError(409, 'This status is managed by the dispatch lifecycle; use assignment, dispatch state, complete, or reopen actions');
  }

  if (input.status === IncidentStatus.CLOSED) {
    if (current.status !== IncidentStatus.RESOLVED) throw new AppError(409, 'Incident must be resolved before it can be closed');
    if (!INCIDENT_CLOSING_ROLES.has(req.user!.role)) {
      throw new AppError(403, 'Only operations roles can close an incident');
    }
  }

  const timestamps: Record<string, Date> = {};
  if (input.status === IncidentStatus.CLOSED) timestamps.closedAt = new Date();

  const row = await prisma.$transaction(async tx => {
    const updated = await tx.incident.update({ where: { id }, data: { status: input.status, ...timestamps } });
    await tx.incidentStatusEvent.create({
      data: { incidentId: id, fromStatus: current.status, toStatus: input.status, actorId: req.user!.id, note: input.note }
    });
    return updated;
  });

  await audit(req, 'STATUS_CHANGE', 'Incident', id, current, row);
  emitOps('incident.updated', row);
  res.json(row);
}));

export default router;