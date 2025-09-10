import { z } from 'zod';

export const crearEquipoSchema = z.object({
  nombre: z.string().min(1, 'El nombre del equipo es obligatorio'),
});

export type CrearEquipoInput = z.infer<typeof crearEquipoSchema>;