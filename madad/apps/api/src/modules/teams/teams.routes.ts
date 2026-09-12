import { Router } from 'express';
import { DispatchStatus, Role, TeamMemberRole, TeamStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../config/db.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { pathId } from '../../lib/params.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { AppError } from '../../lib/errors.js';
import { audit } from '../../lib/audit.js';
import { emitOps } from '../../realtime.js';

const router = Router();
router.use(authenticate);

const MemberInput = z.object({
  userId: z.string().min(1),
  memberRole: z.nativeEnum(TeamMemberRole).default(TeamMemberRole.TECHNICIAN)
});

const CreateTeamInput = z.object({
  code: z.string().min(2),
  name: z.string().min(2),
  specialization: z.string().min(2),
  skills: z.array(z.string()).default([]),
  siteId: z.string().min(1),
  zoneId: z.string().nullable().optional(),
  latitude: z.number(),
  longitude: z.number(),
  maxConcurrentJobs: z.number().int().min(1).default(2),
  members: z.array(MemberInput).default([])
});

router.get('/me', asyncHandler(async (req, res) => {
  const memberships = await prisma.teamMember.findMany({
    where: { userId: req.user!.id },
    include: {
      team: {
        include: {
          site: true,
          zone: true,
          dispatches: {
            where: { status: { in: [DispatchStatus.ACCEPTED, DispatchStatus.DISPATCHED, DispatchStatus.ARRIVED] } },
            include: { incident: true },
            orderBy: { proposedAt: 'desc' }
          }
        }
      }
    }
  });
  res.json(memberships);
}));

router.get('/', asyncHandler(async (_req, res) => {
  res.json(await prisma.team.findMany({
    include: {
      site: true,
      zone: true,
      members: {
        include: { user: { select: { id: true, name: true, role: true, isActive: true } } }
      },
      dispatches: {
        where: { status: { in: [DispatchStatus.ACCEPTED, DispatchStatus.DISPATCHED, DispatchStatus.ARRIVED] } },
        include: { incident: { select: { id: true, code: true, title: true, severity: true, status: true } } },
        orderBy: { proposedAt: 'desc' }
      }
    },
    orderBy: { name: 'asc' }
  }));
}));

router.post('/', authorize(Role.ADMIN), asyncHandler(async (req, res) => {
  const input = CreateTeamInput.parse(req.body);
  const users = input.members.length
    ? await prisma.user.findMany({ where: { id: { in: input.members.map(member => member.userId) }, isActive: true } })
    : [];
  if (users.length !== input.members.length) throw new AppError(400, 'One or more team members are invalid or inactive');

  const row = await prisma.team.create({
    data: {
      code: input.code,
      name: input.name,
      specialization: input.specialization,
      skills: input.skills,
      siteId: input.siteId,
      zoneId: input.zoneId,
      latitude: input.latitude,
      longitude: input.longitude,
      maxConcurrentJobs: input.maxConcurrentJobs,
      members: {
        create: input.members.map(member => ({ userId: member.userId, memberRole: member.memberRole }))
      }
    },
    include: { members: { include: { user: { select: { id: true, name: true, role: true } } } }, site: true, zone: true }
  });
  await audit(req, 'CREATE', 'Team', row.id, undefined, row);
  emitOps('team.created', row);
  res.status(201).json(row);
}));

router.post('/:id/members', authorize(Role.ADMIN), asyncHandler(async (req, res) => {
  const teamId = pathId(req.params.id);
  const input = MemberInput.parse(req.body);
  const [team, user] = await Promise.all([
    prisma.team.findUnique({ where: { id: teamId } }),
    prisma.user.findUnique({ where: { id: input.userId } })
  ]);
  if (!team || !user || !user.isActive) throw new AppError(404, 'Team or active user not found');

  const membership = await prisma.teamMember.upsert({
    where: { teamId_userId: { teamId, userId: input.userId } },
    update: { memberRole: input.memberRole },
    create: { teamId, userId: input.userId, memberRole: input.memberRole },
    include: { user: { select: { id: true, name: true, role: true } } }
  });
  await audit(req, 'UPSERT_MEMBER', 'Team', teamId, undefined, membership);
  emitOps('team.member.updated', membership);
  res.status(201).json(membership);
}));

router.delete('/:id/members/:userId', authorize(Role.ADMIN), asyncHandler(async (req, res) => {
  const teamId = pathId(req.params.id);
  const userId = pathId(req.params.userId, 'userId');
  const existing = await prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId } } });
  if (!existing) throw new AppError(404, 'Team membership not found');
  await prisma.teamMember.delete({ where: { teamId_userId: { teamId, userId } } });
  await audit(req, 'REMOVE_MEMBER', 'Team', teamId, existing, undefined);
  emitOps('team.member.removed', { teamId, userId });
  res.status(204).send();
}));

router.patch('/:id/status', authorize(Role.ADMIN, Role.COMMANDER, Role.DISPATCHER, Role.SUPERVISOR), asyncHandler(async (req, res) => {
  const id = pathId(req.params.id);
  const { status } = z.object({ status: z.nativeEnum(TeamStatus) }).parse(req.body);
  res.json(await prisma.team.update({ where: { id }, data: { status } }));
}));

export default router;
