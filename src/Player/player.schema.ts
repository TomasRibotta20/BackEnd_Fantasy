import { z } from 'zod';

export const createPlayerSchema = z.object({
  apiId: z.number().int().positive('El ID de API debe ser un número positivo'),
  name: z.string().min(1, 'El nombre no puede estar vacío').nullable().optional(),
  firstname: z.string().min(1, 'El nombre no puede estar vacío').nullable().optional(),
  lastname: z.string().min(1, 'El apellido no puede estar vacío').nullable().optional(),
  age: z.number().int().min(15, 'La edad mínima es 15').max(50, 'La edad máxima es 50').nullable().optional(),
  nationality: z.string().min(2, 'La nacionalidad debe tener al menos 2 caracteres').nullable().optional(),
  height: z.string().regex(/^\d+cm$|^\d+'\d+"$/, 'Altura debe ser formato: 180cm o 6\'0"').nullable().optional(),
  weight: z.string().regex(/^\d+kg$/, 'Peso debe ser formato: 70kg').nullable().optional(),
  photo: z.string().url('Debe ser una URL válida').nullable().optional(),
  jerseyNumber: z.number().int().min(1, 'El número debe ser mayor a 0').max(99, 'El número debe ser menor a 100').nullable().optional(),
  clubId: z.number().int().positive('El ID del club debe ser un número positivo'),
  positionId: z.number().int().positive('El ID de la posición debe ser un número positivo').nullable().optional(),
});

export const updatePlayerSchema = createPlayerSchema.partial()
  .refine(obj => Object.keys(obj).length > 0, {
    message: 'Se debe enviar al menos un campo para actualizar',
  });

export const findAllPlayersQuerySchema = z.object({
  name: z.string().min(1, 'El nombre no puede estar vacío').optional(),
  position: z.string().min(1, 'La posición no puede estar vacía').optional(),
  club: z.string().min(1, 'El club no puede estar vacío').optional(),
  page: z.string().regex(/^\d+$/, 'La página debe ser un número válido').optional(),
  limit: z.string().regex(/^\d+$/, 'El límite debe ser un número válido').optional(),
});

export const idPlayerParamsSchema = z.object({
  id: z.string().regex(/^\d+$/, 'El ID debe ser un número válido')
});

export type CreatePlayerInput = z.infer<typeof createPlayerSchema>;
export type UpdatePlayerInput = z.infer<typeof updatePlayerSchema>;
export type FindAllPlayersQuery = z.infer<typeof findAllPlayersQuerySchema>;
export type IdPlayerParams = z.infer<typeof idPlayerParamsSchema>;