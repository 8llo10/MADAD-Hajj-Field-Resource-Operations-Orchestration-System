import { AssignmentMode, DispatchStatus, IncidentStatus } from '@prisma/client';
import { prisma } from '../../config/db.js';
import { emitOps } from '../../realtime.js';
import { assignBestImmediately } from './assignment.service.js';

let running = false;

export async function runAutoAssignmentSweep() {
  if (running) return;
  running = true;

  try {
    const now = new Date();
    const incidents = await prisma.incident.findMany({
      where: {
        autoAssignmentEnabled: true,
        autoAssignAt: { lte: now },
        status: { in: [IncidentStatus.OPEN, IncidentStatus.TRIAGED, IncidentStatus.REOPENED] }
      },
      orderBy: [{ severity: 'desc' }, { autoAssignAt: 'asc' }],
      take: 25
    });

    for (const incident of incidents) {
      try {
        const active = await prisma.dispatch.findFirst({
          where: {
            incidentId: incident.id,
            status: { in: [DispatchStatus.ACCEPTED, DispatchStatus.DISPATCHED, DispatchStatus.ARRIVED] }
          }
        });
        if (active) continue;

        // Human/AI proposals that were never accepted must not block the timeout fallback.
        await prisma.dispatch.updateMany({
          where: { incidentId: incident.id, status: DispatchStatus.PROPOSED },
          data: { status: DispatchStatus.CANCELLED }
        });

        const dispatch = await assignBestImmediately(incident.id, AssignmentMode.AUTO_TIMEOUT, null);
        await prisma.auditLog.create({
          data: {
            action: 'AUTO_TIMEOUT_ASSIGN',
            entity: 'Incident',
            entityId: incident.id,
            afterData: JSON.parse(JSON.stringify(dispatch))
          }
        });
        emitOps('dispatch.auto-assigned', dispatch);
      } catch (error) {
        // No suitable team yet: retry shortly instead of losing the automatic fallback.
        await prisma.incident.update({
          where: { id: incident.id },
          data: { autoAssignAt: new Date(Date.now() + 2 * 60_000) }
        }).catch(() => undefined);
        console.error(`Auto assignment failed for ${incident.code}`, error);
      }
    }
  } finally {
    running = false;
  }
}

export function startAutoAssignmentScheduler() {
  const timer = setInterval(() => {
    void runAutoAssignmentSweep();
  }, 30_000);

  timer.unref();
  void runAutoAssignmentSweep();
  return timer;
}
