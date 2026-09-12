import { IncidentSeverity, Role } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/db.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { audit } from '../../lib/audit.js';
import { AppError } from '../../lib/errors.js';
import { pathId } from '../../lib/params.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { emitOps } from '../../realtime.js';

const router = Router();
router.use(authenticate);

const UpdateIncidentDetailsSchema = z.object({
  title: z.string().min(3).max(180),
  description: z.string().min(3).max(4000),
  category: z.string().min(2).max(120),
  requiredSkills: z.array(z.string().min(1).max(80)).max(20),
  severity: z.nativeEnum(IncidentSeverity),
  slaMinutes: z.number().int().min(1).max(1440),
  autoAssignmentEnabled: z.boolean()
});

// Administrative metadata only. Lifecycle fields are intentionally excluded so
// status, assignment, resolution and reopen history cannot be bypassed here.
router.patch('/:id/details', authorize(Role.ADMIN, Role.COMMANDER), asyncHandler(async (req, res) => {
  const id = pathId(req.params.id);
  const input = UpdateIncidentDetailsSchema.parse(req.body);
  const current = await prisma.incident.findUnique({ where: { id } });
  if (!current) throw new AppError(404, 'Incident not found');

  const row = await prisma.incident.update({
    where: { id },
    data: {
      title: input.title,
      description: input.description,
      category: input.category,
      requiredSkills: input.requiredSkills,
      severity: input.severity,
      slaMinutes: input.slaMinutes,
      autoAssignmentEnabled: input.autoAssignmentEnabled,
      autoAssignAt: input.autoAssignmentEnabled ? current.autoAssignAt : null
    }
  });

  await audit(req, 'UPDATE_DETAILS', 'Incident', id, current, row);
  emitOps('incident.updated', row);
  res.json(row);
}));

export default router;
