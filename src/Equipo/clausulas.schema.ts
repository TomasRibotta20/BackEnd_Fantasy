import { z } from 'zod';

export const blindajeSchema = z.object({
  monto_incremento: z.number()
    .positive('El monto debe ser positivo')
    .min(100000, 'El monto mínimo es 100000')
});

export const equipoJugadorParamsSchema = z.object({
  equipoId: z.string().regex(/^[1-9][0-9]*$/, 'El ID del equipo debe ser un número válido'),
  jugadorId: z.string().regex(/^[1-9][0-9]*$/, 'El ID del jugador debe ser un número válido')
});

export type BlindajeInput = z.infer<typeof blindajeSchema>;
export type EquipoJugadorParams = z.infer<typeof equipoJugadorParamsSchema>;