import { z } from 'zod';

export const createJornadaSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  temporada: z.number().int().positive('La temporada debe ser un número positivo'),
  etapa: z.string().nullable().optional(),
  liga_id: z.number().int().positive('El ID de liga debe ser un número positivo').nullable().optional(),
  fecha_inicio: z.string().refine(val => !isNaN(Date.parse(val)), 'Fecha de inicio debe ser válida').nullable().optional(),
  fecha_fin: z.string().refine(val => !isNaN(Date.parse(val)), 'Fecha de fin debe ser válida').nullable().optional(),
});

export const updateJornadaSchema = createJornadaSchema.partial()
  .refine(obj => Object.keys(obj).length > 0, {
    message: 'Se debe enviar al menos un campo para actualizar',
  });

export const findAllJornadaQuerySchema = z.object({
  temporada: z.string().regex(/^\d+$/, 'La temporada debe ser un número válido').optional(),
  etapa: z.string().min(1, 'La etapa no puede estar vacía').optional(),
  liga_id: z.string().regex(/^\d+$/, 'El ID de liga debe ser un número válido').optional(),
});

export const idJornadaParamsSchema = z.object({
  id: z.string().regex(/^\d+$/, 'El ID debe ser un número válido')
});

export type CreateJornadaInput = z.infer<typeof createJornadaSchema>;
export type UpdateJornadaInput = z.infer<typeof updateJornadaSchema>;
export type FindAllJornadaQuery = z.infer<typeof findAllJornadaQuerySchema>;
export type IdJornadaParams = z.infer<typeof idJornadaParamsSchema>;