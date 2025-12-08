import { z } from 'zod';

export const crearOfertaSchema = z.object({
  equipoJugador_id: z.number().int().positive('El ID del equipoJugador debe ser positivo'),
  monto_ofertado: z.number().positive('El monto debe ser mayor a 0'),
  mensaje_oferente: z.string().max(500, 'El mensaje no puede superar 500 caracteres').optional()
});

export const ofertaIdParamSchema = z.object({
  ofertaId: z.string().regex(/^\d+$/, 'El ID de la oferta debe ser numérico').transform(Number)
});

export const rechazarOfertaSchema = z.object({
  mensaje_respuesta: z.string().max(500, 'El mensaje no puede superar 500 caracteres').optional()
});

export const misOfertasQuerySchema = z.object({
  estado: z.enum(['PENDIENTE', 'ACEPTADA', 'RECHAZADA', 'VENCIDA', 'CANCELADA']).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  offset: z.string().regex(/^\d+$/).transform(Number).optional()
});

export type CrearOfertaInput = z.infer<typeof crearOfertaSchema>;
export type RechazarOfertaInput = z.infer<typeof rechazarOfertaSchema>;
export type MisOfertasQuery = z.infer<typeof misOfertasQuerySchema>;