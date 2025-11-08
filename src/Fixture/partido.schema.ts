import { z } from 'zod';

export const createPartidoSchema = z.object({
  id_api: z.number().int().positive('El ID de API debe ser un número positivo'),
  fecha: z.string().datetime('La fecha debe ser una fecha válida').nullable().optional(),
  estado: z.string().nullable().optional(),
  estado_detalle: z.string().nullable().optional(),
  estadio: z.string().nullable().optional(),
  jornadaId: z.number().int().positive('El ID de jornada debe ser un número positivo'),
  localId: z.number().int().positive('El ID del club local debe ser un número positivo'),
  visitanteId: z.number().int().positive('El ID del club visitante debe ser un número positivo'),
});

export const updatePartidoSchema = createPartidoSchema.partial()
  .refine(obj => Object.keys(obj).length > 0, {
    message: 'Se debe enviar al menos un campo para actualizar',
  });

export type CreatePartidoInput = z.infer<typeof createPartidoSchema>;
export type UpdatePartidoInput = z.infer<typeof updatePartidoSchema>;