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
  slaMinutes: z.number().int().positive()
});

const StatusSchema = z.object({ status: z.nativeEnum(IncidentStatus), note: z.string().optional() });

router.get('/', asyncHandler(async (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status as IncidentStatus : undefined;
  const severity = typeof req.query.severity === 'string' ? req.query.severity as IncidentSeverity : undefined;
  const rows = await prisma.incident.findMany({
    where: { status, severity },
    include: {
      site: true,
      zone: true,
      dispatches: { include: { team: true }, orderBy: { proposedAt: 'desc' }, take: 3 }
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
      statusEvents: { orderBy: { createdAt: 'desc' } },
      dispatches: { include: { team: true, resources: { include: { resource: true } } }, orderBy: { proposedAt: 'desc' } }
    }
  });
  if (!row) throw new AppError(404, 'Incident not found');
  res.json(row);
}));

router.post('/', authorize(Role.ADMIN, Role.COMMANDER, Role.DISPATCHER, Role.SUPERVISOR), asyncHandler(async (req, res) => {
  const input = CreateIncidentSchema.parse(req.body);
  const code = `INC-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
  const row = await prisma.incident.create({ data: { ...input, code, status: IncidentStatus.OPEN } });
  await prisma.incidentStatusEvent.create({ data: { incidentId: row.id, toStatus: IncidentStatus.OPEN, actorId: req.user!.id, note: 'Incident created' } });
  await audit(req, 'CREATE', 'Incident', row.id, undefined, row);
  emitOps('incident.created', row);
  res.status(201).json(row);
}));

router.patch('/:id/status', authorize(Role.ADMIN, Role.COMMANDER, Role.DISPATCHER, Role.SUPERVISOR, Role.TECHNICIAN), asyncHandler(async (req, res) => {
  const id = pathId(req.params.id);
  const input = StatusSchema.parse(req.body);
  const current = await prisma.incident.findUnique({ where: { id } });
  if (!current) throw new AppError(404, 'Incident not found');
  const timestamps: Record<string, Date> = {};
  if (input.status === IncidentStatus.ASSIGNED) timestamps.assignedAt = new Date();
  if (input.status === IncidentStatus.RESOLVED) timestamps.resolvedAt = new Date();
  if (input.status === IncidentStatus.CLOSED) timestamps.closedAt = new Date();
  const row = await prisma.$transaction(async tx => {
    const updated = await tx.incident.update({ where: { id }, data: { status: input.status, ...timestamps } });
    await tx.incidentStatusEvent.create({ data: { incidentId: id, fromStatus: current.status, toStatus: input.status, actorId: req.user!.id, note: input.note } });
    return updated;
  });
  await audit(req, 'STATUS_CHANGE', 'Incident', id, current, row);
  emitOps('incident.updated', row);
  res.json(row);
}));

export default router;
