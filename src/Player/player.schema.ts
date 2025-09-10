import { z } from 'zod';

export const createPlayerSchema = z.object({
  apiId: z.number('El ID de la API es obligatorio'),
  name: z.string().min(2).max(100).optional(),
  firstname: z.string().min(2).max(100).optional(),
  lastname: z.string().min(2).max(100).optional(),
  age: z.number().min(0).optional(),
  nationality: z.string().min(2).max(100).optional(),
  height: z.string().min(2).max(100).optional(),
  weight: z.string().min(2).max(100).optional(),
  photo: z.string().url().refine((val) => true, { message: 'La foto debe ser una URL válida' }).optional(),
  jerseyNumber: z.number().min(0).optional(),
  club: z.number().int().positive('El ID del club debe ser un número positivo'),
  position: z.number().int().positive('El ID de la posición debe ser un número positivo').optional()
});

export const updatePlayerSchema = createPlayerSchema.partial()
  .refine(obj => Object.keys(obj).length > 0, {
    message: 'Se debe enviar al menos un campo para actualizar',
  });

export type CreatePlayerInput = z.infer<typeof createPlayerSchema>;
export type UpdatePlayerInput = z.infer<typeof updatePlayerSchema>;