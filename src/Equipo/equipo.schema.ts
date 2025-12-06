import { z } from 'zod';

export const crearEquipoSchema = z.object({
  nombre: z.string().min(1, 'El nombre del equipo es obligatorio'),
});

export type CrearEquipoInput = z.infer<typeof crearEquipoSchema>;

export const venderJugadorSchema = z.object({
  jugadorId: z.number().int().positive('El ID del jugador debe ser un número positivo')
});

export type VenderJugadorInput = z.infer<typeof venderJugadorSchema>;