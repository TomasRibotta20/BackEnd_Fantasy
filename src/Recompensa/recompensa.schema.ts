import { z } from 'zod';

const idSchema = z.union([
  z.number().int().positive('El ID debe ser un número positivo'),
  z.string().regex(/^[1-9][0-9]*$/, 'El ID debe ser un número válido')
]);

export const idRecompensaParamsSchema = z.object({
  id: z.string().regex(/^[1-9][0-9]*$/, 'El ID debe ser un número válido')
});

export const elegirPremioSchema = z.object({
  recompensaId: idSchema,
  premioId: idSchema
});

export const confirmarPickSchema = z.object({
  recompensaId: idSchema,
  jugadorId: idSchema
});

export const idTorneoParamsSchema = z.object({
  torneoId: z.string().regex(/^[1-9][0-9]*$/, 'El ID de torneo debe ser un número válido')
});

export type IdRecompensaParams = z.infer<typeof idRecompensaParamsSchema>;
export type ElegirPremioInput = z.infer<typeof elegirPremioSchema>;
export type ConfirmarPickInput = z.infer<typeof confirmarPickSchema>;
export type IdTorneoParams = z.infer<typeof idTorneoParamsSchema>;