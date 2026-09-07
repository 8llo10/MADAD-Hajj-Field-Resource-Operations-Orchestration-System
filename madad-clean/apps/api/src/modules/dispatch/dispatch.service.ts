import type { Incident, Team } from '@prisma/client';
import { prisma } from '../../db.js';
import { AppError } from '../../lib/errors.js';

type TeamCandidate = Team & { site:{id:string;name:string}; zone:{id:string;name:string}|null };
export type TeamScore = {
  team: TeamCandidate;
  score: number;
  distanceKm: number;
  etaMinutes: number;
  recommended: boolean;
  breakdown: { availability:number; specialization:number; skills:number; proximity:number; workload:number; locationFit:number };
  explanation: string[];
};
const rad=(d:number)=>d*Math.PI/180;
const haversine=(aLat:number,aLon:number,bLat:number,bLon:number)=>{const R=6371,dLat=rad(bLat-aLat),dLon=rad(bLon-aLon);const a=Math.sin(dLat/2)**2+Math.cos(rad(aLat))*Math.cos(rad(bLat))*Math.sin(dLon/2)**2;return 2*R*Math.asin(Math.sqrt(a));};
const norm=(s:string)=>s.trim().toLowerCase();

export async function rankTeams(incidentId:string):Promise<TeamScore[]> {
  const incident=await prisma.incident.findUnique({where:{id:incidentId}}); if(!incident)throw new AppError(404,'Incident not found');
  const teams=await prisma.team.findMany({where:{status:{not:'OFFLINE'}},include:{site:{select:{id:true,name:true}},zone:{select:{id:true,name:true}}}});
  const scored=teams.map(team=>scoreTeam(incident,team)).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.distanceKm-b.distanceKm);
  return scored.map((x,i)=>({...x,recommended:i===0}));
}

function scoreTeam(incident:Incident, team:TeamCandidate):Omit<TeamScore,'recommended'> {
  const explanation:string[]=[];
  const distanceKm=haversine(incident.latitude,incident.longitude,team.latitude,team.longitude);
  const etaMinutes=Math.max(3,Math.round(distanceKm/0.55));
  const capacity=Math.max(1,team.maxConcurrentJobs);
  const availability=team.status==='AVAILABLE'?25:team.activeJobs<capacity?14:0;
  if(availability===0)return {team,score:0,distanceKm,etaMinutes,breakdown:{availability:0,specialization:0,skills:0,proximity:0,workload:0,locationFit:0},explanation:['Team has no available job capacity']};
  explanation.push(team.status==='AVAILABLE'?'Team is currently available':'Team is busy but still has remaining capacity');
  const specialization=norm(team.specialization)===norm(incident.category)?22:8;
  if(specialization===22)explanation.push('Specialization directly matches the incident category');
  const required=incident.requiredSkills.map(norm); const have=team.skills.map(norm); const matched=required.filter(s=>have.includes(s)).length;
  const skills=required.length===0?12:Math.round(20*(matched/required.length)); if(matched)explanation.push(`Matches ${matched}/${required.length} required skills`);
  const proximity=distanceKm<=1?18:distanceKm<=3?15:distanceKm<=7?11:distanceKm<=15?6:2; explanation.push(`${distanceKm.toFixed(1)} km away, ETA about ${etaMinutes} min`);
  const loadRatio=team.activeJobs/capacity; const workload=loadRatio===0?10:loadRatio<=0.5?7:3;
  const sameZone=Boolean(incident.zoneId&&team.zoneId===incident.zoneId); const sameSite=team.siteId===incident.siteId; const locationFit=sameZone?5:sameSite?3:0; if(sameZone)explanation.push('Already positioned in the same operational zone'); else if(sameSite)explanation.push('Already positioned in the same site');
  const score=Math.min(100,availability+specialization+skills+proximity+workload+locationFit);
  return {team,score,distanceKm:Number(distanceKm.toFixed(2)),etaMinutes,breakdown:{availability,specialization,skills,proximity,workload,locationFit},explanation};
}

export async function proposeBestDispatch(incidentId:string){
  const ranked=await rankTeams(incidentId); const best=ranked[0]; if(!best)throw new AppError(409,'No eligible team is currently available');
  return prisma.dispatch.create({data:{incidentId,teamId:best.team.id,score:best.score,distanceKm:best.distanceKm,etaMinutes:best.etaMinutes,explanation:{breakdown:best.breakdown,reasons:best.explanation,recommended:true}},include:{team:true,incident:true}});
}
