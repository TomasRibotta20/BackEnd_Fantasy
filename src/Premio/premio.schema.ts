import { z } from 'zod';

const rangoPrecioSchema = z.object({
  min: z.number().min(0, 'El mínimo debe ser mayor o igual a 0'),
  max: z.number().nullable(),
  peso: z.number().min(0).max(100, 'El peso debe estar entre 0 y 100')
}).refine(data => data.max === null || data.max > data.min, {
  message: 'El máximo debe ser mayor que el mínimo'
});

const configJuegoAzarSchema = z.object({
  distribucion: z.array(rangoPrecioSchema).min(1, 'Debe haber al menos una distribución')
});

const createSaldoSchema = z.object({
  tipo: z.literal('saldo'),
  tier: z.enum(['oro', 'plata', 'bronce']),
  descripcion: z.string().optional(),
  monto: z.number().positive('El monto debe ser mayor a 0')
});

const createRuletaSchema = z.object({
  tipo: z.literal('ruleta'),
  tier: z.enum(['oro', 'plata', 'bronce']),
  descripcion: z.string().optional(),
  configuracion: configJuegoAzarSchema
});

const createPlayerPickSchema = z.object({
  tipo: z.literal('pick'),
  tier: z.enum(['oro', 'plata', 'bronce']),
  descripcion: z.string().optional(),
  configuracion: configJuegoAzarSchema
});

export const createPremioSchema = z.discriminatedUnion('tipo', [
  createSaldoSchema,
  createRuletaSchema,
  createPlayerPickSchema
]);

const updateSaldoSchema = z.object({
  tier: z.enum(['oro', 'plata', 'bronce']).optional(),
  descripcion: z.string().optional(),
  monto: z.number().positive('El monto debe ser mayor a 0').optional()
});

const updateRuletaSchema = z.object({
  tier: z.enum(['oro', 'plata', 'bronce']).optional(),
  descripcion: z.string().optional(),
  configuracion: configJuegoAzarSchema.optional()
});

const updatePlayerPickSchema = z.object({
  tier: z.enum(['oro', 'plata', 'bronce']).optional(),
  descripcion: z.string().optional(),
  configuracion: configJuegoAzarSchema.optional()
});

export const updatePremioSchema = z.object({
  tier: z.enum(['oro', 'plata', 'bronce']).optional(),
  descripcion: z.string().optional(),
  monto: z.number().positive().optional(),
  configuracion: configJuegoAzarSchema.optional()
}).refine(obj => Object.keys(obj).length > 0, {
  message: 'Se debe enviar al menos un campo para actualizar',
});

export const idPremioParamsSchema = z.object({
  id: z.string().regex(/^[1-9][0-9]*$/, 'El ID debe ser un número válido')
});

export const tierParamsSchema = z.object({
  tier: z.enum(['oro', 'plata', 'bronce'])
});

export const tipoParamsSchema = z.object({
  tipo: z.enum(['saldo', 'ruleta', 'pick'])
});

export type CreatePremioInput = z.infer<typeof createPremioSchema>;
export type UpdatePremioInput = z.infer<typeof updatePremioSchema>;
export type IdPremioParams = z.infer<typeof idPremioParamsSchema>;
export type TierParams = z.infer<typeof tierParamsSchema>;
export type TipoParams = z.infer<typeof tipoParamsSchema>;