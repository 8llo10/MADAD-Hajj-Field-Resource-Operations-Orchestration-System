import { DispatchStatus, IncidentStatus, ResourceStatus, TeamStatus } from '@prisma/client';
import { prisma } from '../../config/db.js';
import { AppError } from '../../lib/errors.js';

const ACTIVE = new Set<DispatchStatus>([DispatchStatus.ACCEPTED, DispatchStatus.DISPATCHED, DispatchStatus.ARRIVED]);

function kmBetween(lat1: number, lon1: number, lat2: number, lon2: number) {
  const r = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function clamp(n: number, min = 0, max = 100) { return Math.max(min, Math.min(max, n)); }

async function requireMemberDispatch(userId: string, dispatchId: string) {
  const dispatch = await prisma.dispatch.findUnique({
    where: { id: dispatchId },
    include: { incident: true, team: { include: { members: true } }, resources: true }
  });
  if (!dispatch) throw new AppError(404, 'Dispatch not found');
  if (!dispatch.team.members.some(m => m.userId === userId)) throw new AppError(403, 'This dispatch is not assigned to your team');
  return dispatch;
}

export async function getFieldWorkspace(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, lastKnownLatitude: true, lastKnownLongitude: true, locationUpdatedAt: true }
  });
  if (!user) throw new AppError(404, 'User not found');

  const memberships = await prisma.teamMember.findMany({
    where: { userId },
    include: {
      team: {
        include: {
          site: true,
          zone: true,
          members: { include: { user: { select: { id: true, name: true } } } },
          dispatches: {
            where: { status: { in: [DispatchStatus.ACCEPTED, DispatchStatus.DISPATCHED, DispatchStatus.ARRIVED] } },
            include: { incident: { include: { site: true, zone: true } } },
            orderBy: { acceptedAt: 'desc' }
          }
        }
      }
    }
  });

  const myResolutions = await prisma.incidentResolution.findMany({ where: { resolvedByUserId: userId }, orderBy: { createdAt: 'desc' }, take: 20 });
  const teamIds = memberships.map(m => m.teamId);
  const teamResolutions = teamIds.length
    ? await prisma.incidentResolution.findMany({ where: { teamId: { in: teamIds } }, orderBy: { createdAt: 'desc' }, take: 50 })
    : [];

  const average = (rows: { technicianScore: number }[]) => rows.length ? rows.reduce((s, r) => s + r.technicianScore, 0) / rows.length : 0;
  const teamAverage = teamResolutions.length ? teamResolutions.reduce((s, r) => s + r.teamScore, 0) / teamResolutions.length : 0;

  return {
    user,
    memberships,
    performance: {
      technicianScore: Math.round(average(myResolutions) * 10) / 10,
      teamScore: Math.round(teamAverage * 10) / 10,
      completedIncidents: myResolutions.length,
      recent: myResolutions.slice(0, 5)
    }
  };
}

export async function updateFieldLocation(userId: string, latitude: number, longitude: number) {
  return prisma.user.update({
    where: { id: userId },
    data: { lastKnownLatitude: latitude, lastKnownLongitude: longitude, locationUpdatedAt: new Date() },
    select: { lastKnownLatitude: true, lastKnownLongitude: true, locationUpdatedAt: true }
  });
}

export async function advanceFieldDispatch(userId: string, dispatchId: string, next: 'DISPATCHED' | 'ARRIVED') {
  const dispatch = await requireMemberDispatch(userId, dispatchId);
  const expected = next === 'DISPATCHED' ? DispatchStatus.ACCEPTED : DispatchStatus.DISPATCHED;
  if (dispatch.status !== expected) throw new AppError(409, `Dispatch must be ${expected} before ${next}`);
  const nextDispatch = next === 'DISPATCHED' ? DispatchStatus.DISPATCHED : DispatchStatus.ARRIVED;
  const nextIncident = next === 'DISPATCHED' ? IncidentStatus.EN_ROUTE : IncidentStatus.ON_SITE;
  const now = new Date();

  return prisma.$transaction(async tx => {
    const row = await tx.dispatch.update({
      where: { id: dispatchId },
      data: next === 'DISPATCHED' ? { status: nextDispatch, dispatchedAt: now } : { status: nextDispatch, arrivedAt: now }
    });
    await tx.incident.update({ where: { id: dispatch.incidentId }, data: { status: nextIncident } });
    await tx.incidentStatusEvent.create({ data: { incidentId: dispatch.incidentId, fromStatus: dispatch.incident.status, toStatus: nextIncident, actorId: userId, note: next === 'DISPATCHED' ? 'Field team started travel' : 'Field team arrived on site' } });
    return row;
  });
}

export async function completeFieldDispatch(userId: string, dispatchId: string, input: {
  summary: string;
  actionsTaken: string[];
  evidenceUrls: string[];
  latitude?: number;
  longitude?: number;
}) {
  const dispatch = await requireMemberDispatch(userId, dispatchId);
  if (!ACTIVE.has(dispatch.status)) throw new AppError(409, 'Only an active team dispatch can be completed');
  if (input.actionsTaken.length === 0) throw new AppError(400, 'At least one action taken is required');
  if (input.evidenceUrls.length === 0) throw new AppError(400, 'At least one evidence item is required');

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, 'User not found');
  const now = new Date();
  const responseMinutes = dispatch.acceptedAt && dispatch.dispatchedAt ? Math.max(0, Math.round((dispatch.dispatchedAt.getTime() - dispatch.acceptedAt.getTime()) / 60000)) : null;
  const resolutionMinutes = dispatch.acceptedAt ? Math.max(1, Math.round((now.getTime() - dispatch.acceptedAt.getTime()) / 60000)) : null;
  const slaMet = resolutionMinutes !== null ? resolutionMinutes <= dispatch.incident.slaMinutes : false;

  const lat = input.latitude ?? user.lastKnownLatitude ?? dispatch.team.latitude;
  const lon = input.longitude ?? user.lastKnownLongitude ?? dispatch.team.longitude;
  const distanceKm = kmBetween(lat, lon, dispatch.incident.latitude, dispatch.incident.longitude);

  const slaScore = slaMet ? 30 : clamp(30 - ((resolutionMinutes! - dispatch.incident.slaMinutes) / Math.max(dispatch.incident.slaMinutes, 1)) * 30, 0, 30);
  const responseScore = responseMinutes === null ? 8 : clamp(20 - responseMinutes * 0.8, 0, 20);
  const proximityScore = clamp(20 - distanceKm * 4, 0, 20);
  const evidenceScore = clamp(10 + input.evidenceUrls.length * 4 + Math.min(input.actionsTaken.length, 3) * 2, 0, 20);
  const teamLoadScore = dispatch.team.activeJobs <= dispatch.team.maxConcurrentJobs ? 10 : 5;
  const technicianScore = clamp(slaScore + responseScore + proximityScore + evidenceScore + teamLoadScore);

  const previousTeam = await prisma.incidentResolution.findMany({ where: { teamId: dispatch.teamId }, orderBy: { createdAt: 'desc' }, take: 10 });
  const previousAverage = previousTeam.length ? previousTeam.reduce((s, r) => s + r.technicianScore, 0) / previousTeam.length : technicianScore;
  const teamScore = clamp(previousAverage * 0.7 + technicianScore * 0.3);

  const breakdown = {
    sla: Math.round(slaScore * 10) / 10,
    response: Math.round(responseScore * 10) / 10,
    proximity: Math.round(proximityScore * 10) / 10,
    evidence: Math.round(evidenceScore * 10) / 10,
    teamReadiness: Math.round(teamLoadScore * 10) / 10,
    distanceKm: Math.round(distanceKm * 100) / 100,
    responseMinutes,
    resolutionMinutes,
    slaMinutes: dispatch.incident.slaMinutes,
    slaMet
  };

  return prisma.$transaction(async tx => {
    const resourceIds = dispatch.resources.map(r => r.resourceId);
    if (resourceIds.length) await tx.resource.updateMany({ where: { id: { in: resourceIds } }, data: { status: ResourceStatus.AVAILABLE } });

    const freshTeam = await tx.team.findUnique({ where: { id: dispatch.teamId } });
    if (freshTeam) {
      const activeJobs = Math.max(0, freshTeam.activeJobs - 1);
      await tx.team.update({ where: { id: dispatch.teamId }, data: { activeJobs, status: activeJobs > 0 ? TeamStatus.BUSY : TeamStatus.AVAILABLE } });
    }

    await tx.incident.update({ where: { id: dispatch.incidentId }, data: { status: IncidentStatus.RESOLVED, resolvedAt: now, resolvedByUserId: userId, resolvedByTeamId: dispatch.teamId, resolutionNote: input.summary } });
    await tx.incidentStatusEvent.create({ data: { incidentId: dispatch.incidentId, fromStatus: dispatch.incident.status, toStatus: IncidentStatus.RESOLVED, actorId: userId, note: input.summary } });
    await tx.dispatch.update({ where: { id: dispatchId }, data: { status: DispatchStatus.COMPLETED, completedAt: now } });

    const resolution = await tx.incidentResolution.create({
      data: {
        incidentId: dispatch.incidentId,
        dispatchId,
        teamId: dispatch.teamId,
        resolvedByUserId: userId,
        summary: input.summary,
        actionsTaken: input.actionsTaken,
        evidenceUrls: input.evidenceUrls,
        latitude: lat,
        longitude: lon,
        distanceKm,
        responseMinutes,
        resolutionMinutes,
        slaMet,
        technicianScore,
        teamScore,
        scoreBreakdown: breakdown
      }
    });

    return { resolution, technicianScore: Math.round(technicianScore * 10) / 10, teamScore: Math.round(teamScore * 10) / 10, breakdown };
  });
}
