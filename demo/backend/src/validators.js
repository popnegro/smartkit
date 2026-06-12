import { z } from 'zod';
import { AppError } from './utils/errors.js';

const screen = z.object({
  id: z.number().int().positive(),
  n: z.string().min(1).max(120),
  b: z.string().min(1).max(80),
  dir: z.string().min(1).max(160).optional(),
  tipo: z.enum(['Peatonal', 'Vehicular', 'Mixto']),
  imp: z.string().regex(/^\d+(\.\d+)*$/, 'Formato de impactos inválido (ej: 52.000)').max(20),
  precio: z.number().nonnegative(),
  status: z.enum(['Activo', 'Pausado']).default('Pausado'),
  video: z.string().max(300).optional(),
  note: z.string().max(500).optional()
}).passthrough();

export const schemas = {
  login: z.object({ email: z.string().email(), password: z.string().min(8).max(200) }),
  screenCreate: screen,
  screenUpdate: screen.partial().omit({ id: true }),
  screensUpsert: z.object({ screens: z.array(screen).max(500) }),
  mediaKitCreate: z.object({
    client: z.string().trim().min(2).max(120),
    contact: z.string().max(120).optional(),
    duration: z.string().max(50),
    screenIds: z.array(z.number().int().positive()).min(1, 'Debe incluir al menos una pantalla').max(100),
    screenSnapshots: z.array(z.unknown()).optional(),
    screens: z.number().int().positive(),
    total: z.number().nonnegative(),
    impacts: z.number().nonnegative(),
    terms: z.string().max(1000).optional(),
    brand: z.record(z.unknown()).optional(),
    validUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD').optional(),
    status: z.string().max(40).optional()
  }).passthrough()
};

export function validate(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) return next(new AppError(400, 'Invalid request body', result.error.flatten()));
    req.body = result.data;
    next();
  };
}
