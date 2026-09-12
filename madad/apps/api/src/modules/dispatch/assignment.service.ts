import {
  AssignmentMode,
  DispatchStatus,
  IncidentStatus,
  NotificationPriority,
  ResourceStatus,
  TeamStatus
} from '@prisma/client';
import { prisma } from '../../config/db.js';
import { AppError } from '../../lib/errors.js';
import { notifyTeamOfIncident } from '../notifications/notification.service.js';
import { rankTeamsForIncident } from './dispatch.service.js';

const ACTIVE_DISPATCH_STATES: DispatchStatus[] = [
  DispatchStatus.PROPOSED,
  DispatchStatus.ACCEPTED,
  DispatchStatus.DISPATCHED,
  DispatchStatus.ARRIVED
];

const COMMITTED_DISPATCH_STATES: DispatchStatus[] = [
  DispatchStatus.ACCEPTED,
  DispatchStatus.DISPATCHED,
  DispatchStatus.ARRIVED
];

async function buildDispatch(incidentId: string, teamId: string, mode: AssignmentMode, assignedById?: string | null) {
  const incident = await prisma.incident.findUnique({ where: { id: incidentId } });
  if (!incident) throw new AppError(404, 'Incident not found');
  if ([IncidentStatus.RESOLVED, IncidentStatus.CLOSED].includes(incident.status)) {
    throw new AppError(409, 'Resolved or closed incidents cannot be assigned');
  }

  const candidate = (await rankTeamsForIncident(incidentId)).find(row => row.team.id === teamId);
  if (!candidate) throw new AppError(404, 'Team ranking not found');
  if (candidate.score < 45) throw new AppError(409, 'Selected team is not suitable for this incident');

  return prisma.dispatch.create({
    data: {
      incidentId,
      teamId,
      score: candidate.score,
      distanceKm: candidate.distanceKm,
      etaMinutes: candidate.etaMinutes,
      assignmentMode: mode,
      assignedById: assignedById ?? null,
      explanation: {
        recommended: candidate.recommended,
        breakdown: candidate.breakdown,
        reasons: candidate.reasons,
        mode
      }
    },
    include: { incident: true, team: true }
  });
}

export async function proposeAssignment(incidentId: string, teamId: string, mode: AssignmentMode, assignedById?: string | null) {
  return buildDispatch(incidentId, teamId, mode, assignedById);
}

export async function proposeBestAssignment(incidentId: string, mode: AssignmentMode, assignedById?: string | null) {
  const ranked = await rankTeamsForIncident(incidentId);
  const best = ranked.find(row => row.recommended && row.score >= 45);
  if (!best) throw new AppError(409, 'No suitable team is currently available');
  return buildDispatch(incidentId, best.team.id, mode, assignedById);
}

export async function acceptAssignment(dispatchId: string, actorId: string | null, resourceIds: string[] = []) {
  const dispatch = await prisma.dispatch.findUnique({
    where: { id: dispatchId },
    include: { incident: true, team: true, resources: true }
  });
  if (!dispatch) throw new AppError(404, 'Dispatch not found');
  if (dispatch.status !== DispatchStatus.PROPOSED) throw new AppError(409, 'Dispatch is not awaiting acceptance');

  const conflicting = await prisma.dispatch.findFirst({
    where: {
      incidentId: dispatch.incidentId,
      id: { not: dispatch.id },
      status: { in: COMMITTED_DISPATCH_STATES }
    }
  });
  if (conflicting) throw new AppError(409, 'Incident already has an active assigned team; use reassignment instead');

  const row = await prisma.$transaction(async tx => {
    const freshTeam = await tx.team.findUnique({ where: { id: dispatch.teamId } });
    if (!freshTeam) throw new AppError(404, 'Team not found');
    if (freshTeam.status === TeamStatus.OFFLINE || freshTeam.activeJobs >= freshTeam.maxConcurrentJobs) {
      throw new AppError(409, 'Team is no longer available');
    }

    if (resourceIds.length) {
      const resources = await tx.resource.findMany({
        where: { id: { in: resourceIds }, status: ResourceStatus.AVAILABLE }
      });
      if (resources.length !== resourceIds.length) throw new AppError(409, 'One or more resources are unavailable');
      await tx.dispatchResource.createMany({
        data: resourceIds.map(resourceId => ({ dispatchId, resourceId })),
        skipDuplicates: true
      });
      await tx.resource.updateMany({
        where: { id: { in: resourceIds } },
        data: { status: ResourceStatus.IN_USE }
      });
    }

    const nextJobs = freshTeam.activeJobs + 1;
    await tx.team.update({
      where: { id: dispatch.teamId },
      data: { status: nextJobs >= freshTeam.maxConcurrentJobs ? TeamStatus.BUSY : freshTeam.status, activeJobs: { increment: 1 } }
    });

    await tx.incident.update({
      where: { id: dispatch.incidentId },
      data: { status: IncidentStatus.ASSIGNED, assignedAt: new Date() }
    });

    await tx.incidentStatusEvent.create({
      data: {
        incidentId: dispatch.incidentId,
        fromStatus: dispatch.incident.status,
        toStatus: IncidentStatus.ASSIGNED,
        actorId,
        note: `Assigned to ${dispatch.team.name} (${dispatch.assignmentMode})`
      }
    });

    return tx.dispatch.update({
      where: { id: dispatchId },
      data: { status: DispatchStatus.ACCEPTED, acceptedAt: new Date() },
      include: { team: true, incident: true, resources: { include: { resource: true } } }
    });
  });

  await notifyTeamOfIncident({
    teamId: dispatch.teamId,
    incidentId: dispatch.incidentId,
    title: 'بلاغ عاجل تم إسناده لفريقك',
    message: `${dispatch.incident.code} — ${dispatch.incident.title}. تم إسناد البلاغ إلى ${dispatch.team.name}.`,
    priority: NotificationPriority.URGENT
  });

  return row;
}

export async function assignBestImmediately(incidentId: string, mode: AssignmentMode, actorId?: string | null) {
  const proposal = await proposeBestAssignment(incidentId, mode, actorId);
  return acceptAssignment(proposal.id, actorId ?? null);
}

export async function assignTeamImmediately(incidentId: string, teamId: string, mode: AssignmentMode, actorId?: string | null) {
  const proposal = await proposeAssignment(incidentId, teamId, mode, actorId);
  return acceptAssignment(proposal.id, actorId ?? null);
}

export async function reassignIncident(incidentId: string, newTeamId: string, actorId: string, mode: AssignmentMode) {
  const current = await prisma.dispatch.findFirst({
    where: { incidentId, status: { in: ACTIVE_DISPATCH_STATES } },
    orderBy: { proposedAt: 'desc' },
    include: { resources: true, team: true, incident: true }
  });

  if (current?.teamId === newTeamId && current.status !== DispatchStatus.PROPOSED) {
    throw new AppError(409, 'Incident is already assigned to this team');
  }

  if (current) {
    await prisma.$transaction(async tx => {
      const resourceIds = current.resources.map(item => item.resourceId);
      if (resourceIds.length) {
        await tx.resource.updateMany({ where: { id: { in: resourceIds } }, data: { status: ResourceStatus.AVAILABLE } });
      }

      await tx.dispatch.update({ where: { id: current.id }, data: { status: DispatchStatus.CANCELLED } });

      if (COMMITTED_DISPATCH_STATES.includes(current.status)) {
        const oldTeam = await tx.team.findUnique({ where: { id: current.teamId } });
        if (oldTeam) {
          const nextJobs = Math.max(0, oldTeam.activeJobs - 1);
          await tx.team.update({
            where: { id: current.teamId },
            data: { activeJobs: nextJobs, status: nextJobs > 0 ? TeamStatus.BUSY : TeamStatus.AVAILABLE }
          });
        }
      }
    });
  }

  return assignTeamImmediately(incidentId, newTeamId, mode, actorId);
}
