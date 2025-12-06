import { z } from 'zod';

export const createPositionSchema = z.object({
  description: z.string().min(3, 'La descripción debe tener al menos 3 caracteres'),
});

export const updatePositionSchema = createPositionSchema.partial()
  .refine(obj => Object.keys(obj).length > 0, {
    message: 'Se debe enviar al menos un campo para actualizar',
  });

export const idPositionParamsSchema = z.object({
  id: z.string().regex(/^[1-9][0-9]*$/, 'El ID debe ser un número válido')
});

export type CreatePositionInput = z.infer<typeof createPositionSchema>;
export type UpdatePositionInput = z.infer<typeof updatePositionSchema>;
export type IdPositionParams = z.infer<typeof idPositionParamsSchema>;