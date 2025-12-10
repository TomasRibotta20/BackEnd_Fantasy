import { z } from 'zod';

export const createJornadaSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  temporada: z.number().int().positive('La temporada debe ser un número positivo'),
  etapa: z.string().nullable().optional(),
  liga_id: z.number().int().positive('El ID de liga debe ser un número positivo').nullable().optional(),
  fecha_inicio: z.string().datetime('Fecha de inicio debe ser una fecha ISO válida').nullable().optional(),
  fecha_fin: z.string().datetime('Fecha de fin debe ser una fecha ISO válida').nullable().optional()
});

export const updateJornadaSchema = createJornadaSchema.partial()
  .refine(obj => Object.keys(obj).length > 0, {
    message: 'Se debe enviar al menos un campo para actualizar',
  });

export const findAllJornadaQuerySchema = z.object({
  temporada: z.string().regex(/^[1-9][0-9]*$/, 'La temporada debe ser un número válido').optional(),
  etapa: z.string().min(1, 'La etapa no puede estar vacía').optional(),
  liga_id: z.string().regex(/^[1-9][0-9]*$/, 'El ID de liga debe ser un número válido').optional(),
});

export const idJornadaParamsSchema = z.object({
  id: z.string().regex(/^[1-9][0-9]*$/, 'El ID debe ser un número válido')
});

export const rankingJornadaTorneoParamsSchema = z.object({
  torneoId: z.string().regex(/^[1-9][0-9]*$/, 'El ID del torneo debe ser un número válido'),
  jornadaId: z.string().regex(/^[1-9][0-9]*$/, 'El ID de jornada debe ser un número válido')
});

export type CreateJornadaInput = z.infer<typeof createJornadaSchema>;
export type UpdateJornadaInput = z.infer<typeof updateJornadaSchema>;
export type FindAllJornadaQuery = z.infer<typeof findAllJornadaQuerySchema>;
export type IdJornadaParams = z.infer<typeof idJornadaParamsSchema>;
export type RankingJornadaTorneoParams = z.infer<typeof rankingJornadaTorneoParamsSchema>;