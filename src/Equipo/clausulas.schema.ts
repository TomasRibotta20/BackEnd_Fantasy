// Equipo/clausulas.schema.ts - NUEVO
import { z } from 'zod';

export const blindajeSchema = z.object({
  monto_incremento: z.number()
    .positive('El monto debe ser positivo')
    .int('El monto debe ser un número entero')
    .min(100000, 'El monto mínimo es $100,000')
});

export const equipoJugadorParamsSchema = z.object({
  equipoId: z.string().regex(/^\d+$/, 'El ID del equipo debe ser un número'),
  jugadorId: z.string().regex(/^\d+$/, 'El ID del jugador debe ser un número')
});