import type { Request } from 'express'; import { prisma } from '../db.js';
export async function audit(req:Request,action:string,entityType:string,entityId?:string,before?:unknown,after?:unknown){
 await prisma.auditLog.create({data:{actorId:req.user?.id,action,entityType,entityId,before:before as any,after:after as any,ip:req.ip,userAgent:req.get('user-agent')}});
}
