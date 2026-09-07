import { z } from 'zod';
export const pathId = (value: unknown, label='id') => z.string().min(1, `${label} is required`).parse(value);
