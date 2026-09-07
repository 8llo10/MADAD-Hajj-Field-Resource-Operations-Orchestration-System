import { z } from 'zod';
export const pathId = (value: string | string[] | undefined, label = 'id') =>
  z.string().min(1, `${label} is required`).parse(Array.isArray(value) ? value[0] : value);
