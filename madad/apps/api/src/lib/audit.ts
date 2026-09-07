import type { Request } from 'express';
import { prisma } from '../config/db.js';

export async function audit(req: Request, action: string, entity: string, entityId?: string, beforeData?: unknown, afterData?: unknown) {
  await prisma.auditLog.create({
    data: {
      actorId: req.user?.id,
      action,
      entity,
      entityId,
      beforeData: beforeData as any,
      afterData: afterData as any
    }
  });
}
