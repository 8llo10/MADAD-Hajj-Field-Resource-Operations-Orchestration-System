import { TeamStatus } from '@prisma/client';
import { prisma } from '../../config/db.js';
import { AppError } from '../../lib/errors.js';
import { haversineKm } from '../../lib/geo.js';

export type TeamScoreBreakdown = {
  availability: number;
  specialization: number;
  skills: number;
  proximity: number;
  workload: number;
  locationFit: number;
};

export type RankedTeam = {
  team: {
    id: string;
    code: string;
    name: string;
    specialization: string;
    status: TeamStatus;
    skills: string[];
    activeJobs: number;
    maxConcurrentJobs: number;
    siteId: string;
    zoneId: string | null;
  };
  score: number;
  distanceKm: number;
  etaMinutes: number;
  recommended: boolean;
  breakdown: TeamScoreBreakdown;
  reasons: string[];
};

function normalize(v: string) { return v.trim().toLowerCase(); }

export async function rankTeamsForIncident(incidentId: string): Promise<RankedTeam[]> {
  const incident = await prisma.incident.findUnique({ where: { id: incidentId } });
  if (!incident) throw new AppError(404, 'Incident not found');
  const teams = await prisma.team.findMany({ include: { site: true, zone: true } });

  const ranked = teams.map(team => {
    const distanceKm = haversineKm(incident.latitude, incident.longitude, team.latitude, team.longitude);
    const available = team.status === TeamStatus.AVAILABLE && team.activeJobs < team.maxConcurrentJobs;
    const specializationMatches = normalize(team.specialization) === normalize(incident.category) || incident.requiredSkills.some(s => normalize(team.specialization).includes(normalize(s)));
    const matchedSkills = incident.requiredSkills.filter(required => team.skills.some(skill => normalize(skill) === normalize(required)));
    const skillRatio = incident.requiredSkills.length ? matchedSkills.length / incident.requiredSkills.length : 1;

    const availability = available ? 25 : team.status === TeamStatus.BUSY && team.activeJobs < team.maxConcurrentJobs ? 10 : 0;
    const specialization = specializationMatches ? 22 : 0;
    const skills = Math.round(skillRatio * 20);
    const proximity = distanceKm <= 1 ? 18 : distanceKm <= 3 ? 15 : distanceKm <= 6 ? 11 : distanceKm <= 10 ? 6 : 2;
    const workloadRatio = team.maxConcurrentJobs ? team.activeJobs / team.maxConcurrentJobs : 1;
    const workload = Math.max(0, Math.round(10 * (1 - workloadRatio)));
    const locationFit = team.zoneId && team.zoneId === incident.zoneId ? 5 : team.siteId === incident.siteId ? 3 : 0;
    const rawScore = availability + specialization + skills + proximity + workload + locationFit;
    const score = available ? rawScore : Math.min(rawScore, 55);
    const etaMinutes = Math.max(3, Math.ceil((distanceKm / 25) * 60 + 2));
    const reasons = [
      available ? 'الفريق متاح حاليًا' : 'توفر الفريق محدود',
      specializationMatches ? 'التخصص مطابق لنوع البلاغ' : 'التخصص غير مطابق بالكامل',
      `${matchedSkills.length}/${incident.requiredSkills.length || 0} من المهارات المطلوبة متطابقة`,
      `يبعد ${distanceKm.toFixed(1)} كم`,
      team.zoneId === incident.zoneId && incident.zoneId ? 'داخل نفس المنطقة' : team.siteId === incident.siteId ? 'داخل نفس الموقع' : 'في موقع آخر'
    ];
    return {
      team: { id: team.id, code: team.code, name: team.name, specialization: team.specialization, status: team.status, skills: team.skills, activeJobs: team.activeJobs, maxConcurrentJobs: team.maxConcurrentJobs, siteId: team.siteId, zoneId: team.zoneId },
      score,
      distanceKm: Number(distanceKm.toFixed(2)),
      etaMinutes,
      recommended: false,
      breakdown: { availability, specialization, skills, proximity, workload, locationFit },
      reasons
    };
  }).sort((a, b) => b.score - a.score || a.distanceKm - b.distanceKm || a.etaMinutes - b.etaMinutes);

  if (ranked[0]) ranked[0].recommended = true;
  return ranked;
}

export async function proposeBestDispatch(incidentId: string) {
  const ranked = await rankTeamsForIncident(incidentId);
  const best = ranked.find(x => x.recommended);
  if (!best || best.score < 45) throw new AppError(409, 'No suitable team is currently available');
  return prisma.dispatch.create({
    data: {
      incidentId,
      teamId: best.team.id,
      score: best.score,
      distanceKm: best.distanceKm,
      etaMinutes: best.etaMinutes,
      explanation: { recommended: true, breakdown: best.breakdown, reasons: best.reasons }
    },
    include: { incident: true, team: true }
  });
}
