import { z } from 'zod';

export const createClubSchema = z.object({
  nombre: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  id_api: z.string().optional(),
});

export const updateClubSchema = createClubSchema.partial()
  .refine(obj => Object.keys(obj).length > 0, {
    message: 'Se debe enviar al menos un campo para actualizar',
  });

export const idClubParamsSchema = z.object({
  id: z.string().regex(/^\d+$/, 'El ID debe ser un número válido')
});

export type CreateClubInput = z.infer<typeof createClubSchema>;
export type UpdateClubInput = z.infer<typeof updateClubSchema>;
export type IdClubParams = z.infer<typeof idClubParamsSchema>;