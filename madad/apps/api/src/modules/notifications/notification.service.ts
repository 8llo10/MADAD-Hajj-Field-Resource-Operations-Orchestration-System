import { NotificationPriority } from '@prisma/client';
import { prisma } from '../../config/db.js';
import { emitOps } from '../../realtime.js';

export async function notifyTeamOfIncident(params: {
  teamId: string;
  incidentId: string;
  title: string;
  message: string;
  priority?: NotificationPriority;
}) {
  const members = await prisma.teamMember.findMany({
    where: { teamId: params.teamId, user: { isActive: true } },
    select: { userId: true }
  });

  if (!members.length) return [];

  await prisma.notification.createMany({
    data: members.map(member => ({
      userId: member.userId,
      incidentId: params.incidentId,
      title: params.title,
      message: params.message,
      priority: params.priority ?? NotificationPriority.URGENT
    }))
  });

  const notifications = await prisma.notification.findMany({
    where: {
      incidentId: params.incidentId,
      userId: { in: members.map(member => member.userId) }
    },
    orderBy: { createdAt: 'desc' },
    take: members.length
  });

  emitOps('notification.created', {
    incidentId: params.incidentId,
    teamId: params.teamId,
    userIds: members.map(member => member.userId)
  });

  return notifications;
}
