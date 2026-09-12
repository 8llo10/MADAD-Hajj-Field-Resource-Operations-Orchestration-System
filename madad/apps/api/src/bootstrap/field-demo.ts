import { AssignmentMode, DispatchStatus, IncidentStatus, Role, TeamMemberRole, TeamStatus } from '@prisma/client';
import { prisma } from '../config/db.js';

export async function ensureFieldDemo() {
  const admin = await prisma.user.findUnique({ where: { email: 'admin@madad.sa' } });
  if (!admin) return;

  const fieldUser = await prisma.user.upsert({
    where: { email: 'field@madad.sa' },
    update: { isActive: true, role: Role.TECHNICIAN },
    create: {
      email: 'field@madad.sa',
      passwordHash: admin.passwordHash,
      name: 'سلمان الحربي',
      role: Role.TECHNICIAN,
      lastKnownLatitude: 21.41425,
      lastKnownLongitude: 39.8949,
      locationUpdatedAt: new Date()
    }
  });

  const team = await prisma.team.findUnique({ where: { code: 'ELEC-A' } });
  const incident = await prisma.incident.findUnique({ where: { code: 'INC-2026-001' } });
  if (!team || !incident) return;

  await prisma.teamMember.upsert({
    where: { teamId_userId: { teamId: team.id, userId: fieldUser.id } },
    update: { memberRole: TeamMemberRole.TECHNICIAN },
    create: { teamId: team.id, userId: fieldUser.id, memberRole: TeamMemberRole.TECHNICIAN }
  });

  const active = await prisma.dispatch.findFirst({
    where: { incidentId: incident.id, status: { in: [DispatchStatus.ACCEPTED, DispatchStatus.DISPATCHED, DispatchStatus.ARRIVED] } }
  });

  if (!active && ![IncidentStatus.RESOLVED, IncidentStatus.CLOSED].includes(incident.status as IncidentStatus)) {
    await prisma.$transaction(async tx => {
      await tx.dispatch.create({
        data: {
          incidentId: incident.id,
          teamId: team.id,
          score: 96,
          distanceKm: 0.05,
          etaMinutes: 2,
          explanation: { recommended: true, reasons: ['Closest qualified electrical team', 'Available capacity', 'Exact site and skill match'], demo: true },
          status: DispatchStatus.ACCEPTED,
          assignmentMode: AssignmentMode.AI,
          acceptedAt: new Date()
        }
      });
      await tx.incident.update({ where: { id: incident.id }, data: { status: IncidentStatus.ASSIGNED, assignedAt: new Date() } });
      await tx.team.update({ where: { id: team.id }, data: { status: TeamStatus.BUSY, activeJobs: { increment: 1 } } });
    });
  }

  const notification = await prisma.notification.findFirst({ where: { userId: fieldUser.id, incidentId: incident.id } });
  if (!notification) {
    await prisma.notification.create({
      data: { userId: fieldUser.id, incidentId: incident.id, title: 'بلاغ عاجل لفريقك', message: 'INC-2026-001 — انقطاع كهربائي في قطاع 1. أنت ضمن أقرب فريق مؤهل للموقع.', priority: 'URGENT' }
    });
  }
}
