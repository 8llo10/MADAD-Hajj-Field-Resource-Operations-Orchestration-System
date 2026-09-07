import { Router } from 'express'; import { prisma } from '../../db.js'; import { authenticate } from '../../middleware/auth.js'; import { asyncHandler } from '../../lib/async.js'; import { analyzeIncident } from '../ai/ai.service.js'; import { AppError } from '../../lib/errors.js';
const router=Router();router.use(authenticate);
router.get('/dashboard',asyncHandler(async(_req,res)=>{
 const [open,critical,availableTeams,busyTeams,resources,stock,recent]=await Promise.all([
  prisma.incident.count({where:{status:{notIn:['RESOLVED','CLOSED','CANCELLED']}}}),
  prisma.incident.count({where:{severity:'CRITICAL',status:{notIn:['RESOLVED','CLOSED','CANCELLED']}}}),
  prisma.team.count({where:{status:'AVAILABLE'}}),prisma.team.count({where:{status:'BUSY'}}),
  prisma.resource.groupBy({by:['status'],_count:true}),prisma.inventoryItem.findMany({take:100}),
  prisma.incident.findMany({take:8,orderBy:{reportedAt:'desc'},include:{site:true,zone:true}})
 ]);
 const lowStock=stock.filter(i=>i.quantity<=i.reorderLevel).slice(0,10);
 const since=new Date(Date.now()-24*3600e3);const resolved24=await prisma.incident.count({where:{resolvedAt:{gte:since}}});
 const avgRows=await prisma.incident.findMany({where:{resolvedAt:{not:null},reportedAt:{gte:new Date(Date.now()-7*86400e3)}},select:{reportedAt:true,resolvedAt:true}});
 const avgResolution=avgRows.length?Math.round(avgRows.reduce((sum,x)=>sum+((x.resolvedAt!.getTime()-x.reportedAt.getTime())/60000),0)/avgRows.length):0;
 res.json({kpis:{openIncidents:open,criticalIncidents:critical,availableTeams,busyTeams,resolved24h:resolved24,avgResolutionMinutes:avgResolution},resourceStatus:resources,recentIncidents:recent,lowStock});
}));
router.post('/ai/incidents/:id/analyze',asyncHandler(async(req,res)=>{const i=await prisma.incident.findUnique({where:{id:req.params.id},include:{site:true,zone:true}});if(!i)throw new AppError(404,'Incident not found');const availableTeamCount=await prisma.team.count({where:{status:'AVAILABLE',siteId:i.siteId}});const ageMinutes=(Date.now()-i.reportedAt.getTime())/60000;const ai=analyzeIncident({severity:i.severity,ageMinutes,crowdDensity:i.zone?.crowdDensity||3,siteCriticality:i.site.criticality,peopleAffected:i.peopleAffected,availableTeamCount,requiredSkills:i.requiredSkills.length});await prisma.incident.update({where:{id:i.id},data:{aiRiskScore:ai.riskScore,aiSlaBreachProbability:ai.slaBreachProbability,aiEstimatedResolutionMinutes:ai.estimatedResolutionMinutes,aiSummary:ai.summary}});res.json(ai)}));
export default router;
