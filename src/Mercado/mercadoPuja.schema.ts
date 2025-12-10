import e from 'express';
import { z } from 'zod';

export const ofertarSchema = z.object({
  itemMercadoId: z.number().int().positive('El ID del item debe ser un número positivo'),
  monto: z.number().int().positive('El monto debe ser un número positivo')
});

export const cancelarOfertaParamsSchema = z.object({
  pujaId: z.string().regex(/^\d+$/, 'El ID de la puja debe ser numérico').transform(Number)
});

export const obtenerMisOfertasParamsSchema = z.object({
  equipoId: z.string().regex(/^\d+$/, 'El ID del equipo debe ser numérico').transform(Number)
});

export type OfertarInput = z.infer<typeof ofertarSchema>;
export type CancelarOfertaParams = z.infer<typeof cancelarOfertaParamsSchema>;
export type ObtenerMisOfertasParams = z.infer<typeof obtenerMisOfertasParamsSchema>;