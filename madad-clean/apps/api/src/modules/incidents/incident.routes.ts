import { Router } from 'express';
import { IncidentSeverity, IncidentStatus, Role } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { asyncHandler } from '../../lib/async.js';
import { pathId } from '../../lib/params.js';
import { audit } from '../../lib/audit.js';
import { emitOps } from '../../realtime.js';
import { AppError } from '../../lib/errors.js';
const router=Router(); router.use(authenticate);
router.get('/',asyncHandler(async(req,res)=>{
  const q=z.object({status:z.nativeEnum(IncidentStatus).optional(),severity:z.nativeEnum(IncidentSeverity).optional(),siteId:z.string().optional()}).parse(req.query);
  res.json(await prisma.incident.findMany({where:q,include:{site:true,zone:true,dispatches:{include:{team:true},orderBy:{proposedAt:'desc'},take:1}},orderBy:{openedAt:'desc'}}));
}));
router.get('/:id',asyncHandler(async(req,res)=>{const id=pathId(req.params.id);const row=await prisma.incident.findUnique({where:{id},include:{site:true,zone:true,statusEvents:{orderBy:{createdAt:'asc'}},dispatches:{include:{team:true,resources:{include:{resource:true}}},orderBy:{proposedAt:'desc'}}}});if(!row)throw new AppError(404,'Incident not found');res.json(row)}));
router.post('/',authorize(Role.ADMIN,Role.COMMANDER,Role.DISPATCHER,Role.SUPERVISOR),asyncHandler(async(req,res)=>{
  const p=z.object({title:z.string().min(3),description:z.string().min(3),category:z.string().min(2),requiredSkills:z.array(z.string()).default([]),severity:z.nativeEnum(IncidentSeverity),siteId:z.string(),zoneId:z.string().nullable().optional(),latitude:z.number(),longitude:z.number(),slaMinutes:z.number().int().positive()}).parse(req.body);
  const code=`INC-${Date.now().toString().slice(-8)}`; const row=await prisma.incident.create({data:{...p,code},include:{site:true,zone:true}}); await prisma.incidentStatusEvent.create({data:{incidentId:row.id,toStatus:'OPEN',actorId:req.user!.id,note:'Incident created'}}); await audit(req,'CREATE','Incident',row.id,undefined,row); emitOps('incident.created',row); res.status(201).json(row);
}));
router.patch('/:id/status',authorize(Role.ADMIN,Role.COMMANDER,Role.DISPATCHER,Role.SUPERVISOR,Role.TECHNICIAN),asyncHandler(async(req,res)=>{
  const id=pathId(req.params.id); const p=z.object({status:z.nativeEnum(IncidentStatus),note:z.string().optional()}).parse(req.body); const current=await prisma.incident.findUnique({where:{id}}); if(!current)throw new AppError(404,'Incident not found');
  const data:{status:IncidentStatus;resolvedAt?:Date;closedAt?:Date}={status:p.status}; if(p.status==='RESOLVED')data.resolvedAt=new Date(); if(p.status==='CLOSED')data.closedAt=new Date();
  const row=await prisma.$transaction(async tx=>{const out=await tx.incident.update({where:{id},data});await tx.incidentStatusEvent.create({data:{incidentId:id,fromStatus:current.status,toStatus:p.status,actorId:req.user!.id,note:p.note}});return out}); await audit(req,'CHANGE_STATUS','Incident',id,current,row); emitOps('incident.updated',row); res.json(row);
}));
export default router;
