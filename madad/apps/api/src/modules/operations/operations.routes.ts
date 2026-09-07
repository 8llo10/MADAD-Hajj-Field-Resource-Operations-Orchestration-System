import { Router } from 'express';
import { IncidentSeverity, IncidentStatus, ResourceStatus, TeamStatus } from '@prisma/client';
import { prisma } from '../../config/db.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { authenticate } from '../../middleware/auth.js';

const router = Router(); router.use(authenticate);
router.get('/overview', asyncHandler(async (_req, res) => {
  const [openIncidents, criticalIncidents, availableTeams, busyTeams, availableResources, lowStock, recentIncidents] = await Promise.all([
    prisma.incident.count({ where: { status: { notIn: [IncidentStatus.RESOLVED, IncidentStatus.CLOSED] } } }),
    prisma.incident.count({ where: { severity: IncidentSeverity.CRITICAL, status: { notIn: [IncidentStatus.RESOLVED, IncidentStatus.CLOSED] } } }),
    prisma.team.count({ where: { status: TeamStatus.AVAILABLE } }),
    prisma.team.count({ where: { status: TeamStatus.BUSY } }),
    prisma.resource.count({ where: { status: ResourceStatus.AVAILABLE } }),
    prisma.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*)::bigint AS count FROM "InventoryItem" WHERE quantity <= "reorderLevel"`,
    prisma.incident.findMany({ take: 8, orderBy: { openedAt: 'desc' }, include: { site: true, zone: true } })
  ]);
  res.json({
    counters: { openIncidents, criticalIncidents, availableTeams, busyTeams, availableResources, lowStock: Number(lowStock[0]?.count ?? 0) },
    recentIncidents
  });
}));

router.get('/sites', asyncHandler(async (_req, res) => res.json(await prisma.site.findMany({ include: { zones: true }, orderBy: { name: 'asc' } }))));
router.get('/notifications', asyncHandler(async (req, res) => res.json(await prisma.notification.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: 'desc' }, take: 50 }))));
router.get('/audit', asyncHandler(async (_req, res) => res.json(await prisma.auditLog.findMany({ include: { actor: { select: { name: true, email: true } } }, orderBy: { createdAt: 'desc' }, take: 100 }))));
export default router;
