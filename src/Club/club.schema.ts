import { z } from 'zod';

export const createClubSchema = z.object({
  id_api: z.number().int().positive('El ID de API debe ser un número positivo'),
  nombre: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  codigo: z.string().min(2, 'El código debe tener al menos 2 caracteres').optional().nullable(),
  logo: z.string().url('El logo debe ser una URL válida').optional().nullable(),
  pais: z.string().min(2, 'El país debe tener al menos 2 caracteres').optional().nullable(),
  fundado: z.number().int().min(1800, 'El año de fundación debe ser válido').max(new Date().getFullYear(), 'El año no puede ser futuro').optional().nullable(),
  estadio_nombre: z.string().min(3, 'El nombre del estadio debe tener al menos 3 caracteres').optional().nullable(),
  estadio_ciudad: z.string().min(2, 'La ciudad del estadio debe tener al menos 2 caracteres').optional().nullable(),
  estadio_capacidad: z.number().int().positive('La capacidad del estadio debe ser un número positivo').optional().nullable(),
  estadio_imagen: z.string().url('La imagen del estadio debe ser una URL válida').optional().nullable(),
});

export const updateClubSchema = createClubSchema.partial()
  .refine(obj => Object.keys(obj).length > 0, {
    message: 'Se debe enviar al menos un campo para actualizar',
  });

export const idClubParamsSchema = z.object({
  id: z.string().regex(/^[1-9][0-9]*$/, 'El ID debe ser un número válido')
});

export type CreateClubInput = z.infer<typeof createClubSchema>;
export type UpdateClubInput = z.infer<typeof updateClubSchema>;
export type IdClubParams = z.infer<typeof idClubParamsSchema>;