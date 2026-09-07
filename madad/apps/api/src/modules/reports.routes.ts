import { Router } from 'express';
import { prisma } from '../db.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../lib/async.js';

const router=Router();
router.use(authenticate);

router.get('/reports/operations',asyncHandler(async(_req,res)=>{
  const since=new Date(Date.now()-7*86400e3);
  const [bySeverity,byStatus,sites,teams,resolved]=await Promise.all([
    prisma.incident.groupBy({by:['severity'],where:{reportedAt:{gte:since}},_count:true}),
    prisma.incident.groupBy({by:['status'],where:{reportedAt:{gte:since}},_count:true}),
    prisma.site.findMany({include:{_count:{select:{incidents:true,teams:true,resources:true}}}}),
    prisma.team.findMany({select:{id:true,code:true,name:true,status:true,activeJobs:true,maxConcurrentJobs:true,_count:{select:{dispatches:true}}}}),
    prisma.incident.findMany({where:{resolvedAt:{not:null},reportedAt:{gte:since}},select:{reportedAt:true,resolvedAt:true,severity:true,siteId:true}})
  ]);
  const resolutionMinutes=resolved.map(x=>(x.resolvedAt!.getTime()-x.reportedAt.getTime())/60000);
  const percentile=(a:number[],p:number)=>{if(!a.length)return 0;const b=[...a].sort((x,y)=>x-y);return Math.round(b[Math.min(b.length-1,Math.floor((b.length-1)*p))]);};
  res.json({period:'7d',incidentsBySeverity:bySeverity,incidentsByStatus:byStatus,sites,teams,performance:{resolvedCount:resolved.length,avgResolutionMinutes:resolutionMinutes.length?Math.round(resolutionMinutes.reduce((a,b)=>a+b,0)/resolutionMinutes.length):0,p50ResolutionMinutes:percentile(resolutionMinutes,.5),p90ResolutionMinutes:percentile(resolutionMinutes,.9)}});
}));

export default router;
