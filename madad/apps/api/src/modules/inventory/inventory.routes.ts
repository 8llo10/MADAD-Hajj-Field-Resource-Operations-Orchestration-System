import { Router } from 'express';
import { InventoryTxnType, Role } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../config/db.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { pathId } from '../../lib/params.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { AppError } from '../../lib/errors.js';

const router = Router(); router.use(authenticate);
router.get('/', asyncHandler(async (_req, res) => res.json(await prisma.inventoryItem.findMany({ orderBy: { name: 'asc' } }))));
router.post('/:id/transaction', authorize(Role.ADMIN, Role.COMMANDER, Role.SUPERVISOR), asyncHandler(async (req, res) => {
  const id = pathId(req.params.id);
  const input = z.object({ type: z.nativeEnum(InventoryTxnType), quantity: z.number().int().positive(), reference: z.string().optional(), notes: z.string().optional() }).parse(req.body);
  const item = await prisma.inventoryItem.findUnique({ where: { id } });
  if (!item) throw new AppError(404, 'Inventory item not found');
  const positive = input.type === InventoryTxnType.RECEIPT || input.type === InventoryTxnType.RETURN;
  const delta = positive ? input.quantity : -input.quantity;
  if (item.quantity + delta < 0) throw new AppError(409, 'Insufficient stock');
  const [, updated] = await prisma.$transaction([
    prisma.inventoryTransaction.create({ data: { itemId: id, ...input } }),
    prisma.inventoryItem.update({ where: { id }, data: { quantity: { increment: delta } } })
  ]);
  res.status(201).json(updated);
}));
export default router;
