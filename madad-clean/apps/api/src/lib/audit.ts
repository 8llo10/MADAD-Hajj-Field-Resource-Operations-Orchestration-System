import type { Request } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../db.js';
const asJson = (v: unknown): Prisma.InputJsonValue | undefined => v === undefined ? undefined : JSON.parse(JSON.stringify(v));
export async function audit(req: Request, action:string, entity:string, entityId?:string, beforeData?:unknown, afterData?:unknown) {
  await prisma.auditLog.create({ data:{ actorId:req.user?.id, action, entity, entityId, beforeData:asJson(beforeData), afterData:asJson(afterData) } });
}
