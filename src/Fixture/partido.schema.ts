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

export const findAllPartidoQuerySchema = z.object({
  jornadaId: z.string().regex(/^[1-9][0-9]*$/, 'El ID de jornada debe ser un número válido').optional(),
  clubId: z.string().regex(/^[1-9][0-9]*$/, 'El ID del club debe ser un número válido').optional(),
  from: z.string().datetime('Fecha from debe ser válida').optional(),
  to: z.string().datetime('Fecha to debe ser válida').optional(),
});

export const idPartidoParamsSchema = z.object({
  id: z.string().regex(/^[1-9][0-9]*$/, 'El ID debe ser un número válido')
});

export type CreatePartidoInput = z.infer<typeof createPartidoSchema>;
export type UpdatePartidoInput = z.infer<typeof updatePartidoSchema>;
export type FindAllPartidoQueryInput = z.infer<typeof findAllPartidoQuerySchema>;
export type IdPartidoParamsInput = z.infer<typeof idPartidoParamsSchema>;