import { z } from 'zod';

export const jornadaIdParamsSchema = z.object({
  jornadaId: z.string().regex(/^[1-9][0-9]*$/, 'El ID de jornada debe ser un número positivo')
});

export const jornadaJugadorParamsSchema = z.object({
  jornadaId: z.string().regex(/^[1-9][0-9]*$/, 'El ID de jornada debe ser un número positivo'),
  jugadorId: z.string().regex(/^[1-9][0-9]*$/, 'El ID de jugador debe ser un número positivo')
});

export type JornadaIdParams = z.infer<typeof jornadaIdParamsSchema>;
export type JornadaJugadorParams = z.infer<typeof jornadaJugadorParamsSchema>;