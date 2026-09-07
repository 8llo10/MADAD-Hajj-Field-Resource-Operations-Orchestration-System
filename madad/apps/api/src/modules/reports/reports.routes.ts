import { Router } from 'express';
import { prisma } from '../../config/db.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { authenticate } from '../../middleware/auth.js';

const router = Router(); router.use(authenticate);
router.get('/summary', asyncHandler(async (_req, res) => {
  const incidents = await prisma.incident.findMany({ include: { dispatches: true } });
  const completed = incidents.flatMap(i => i.dispatches).filter(d => d.completedAt);
  const avgEta = completed.length ? Math.round(completed.reduce((s, d) => s + d.etaMinutes, 0) / completed.length) : 0;
  const resolved = incidents.filter(i => i.resolvedAt);
  const avgResolutionMinutes = resolved.length ? Math.round(resolved.reduce((sum, i) => sum + ((i.resolvedAt!.getTime() - i.openedAt.getTime()) / 60000), 0) / resolved.length) : 0;
  const slaMet = resolved.filter(i => ((i.resolvedAt!.getTime() - i.openedAt.getTime()) / 60000) <= i.slaMinutes).length;
  const bySeverity = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(severity => ({ severity, count: incidents.filter(i => i.severity === severity).length }));
  res.json({ totalIncidents: incidents.length, resolvedIncidents: resolved.length, avgEtaMinutes: avgEta, avgResolutionMinutes, slaCompliancePct: resolved.length ? Math.round((slaMet / resolved.length) * 100) : 100, bySeverity });
}));
export default router;
