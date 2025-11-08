import { z } from 'zod';

export const createJornadaSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  temporada: z.number().int().positive('La temporada debe ser un número positivo'),
  etapa: z.string().nullable().optional(),
  liga_id: z.number().int().positive('El ID de liga debe ser un número positivo').nullable().optional(),
  fecha_inicio: z.string().datetime('Fecha de inicio debe ser una fecha válida').nullable().optional(),
  fecha_fin: z.string().datetime('Fecha de fin debe ser una fecha válida').nullable().optional(),
});

export const updateJornadaSchema = createJornadaSchema.partial()
  .refine(obj => Object.keys(obj).length > 0, {
    message: 'Se debe enviar al menos un campo para actualizar',
  });

export type CreateJornadaInput = z.infer<typeof createJornadaSchema>;
export type UpdateJornadaInput = z.infer<typeof updateJornadaSchema>;