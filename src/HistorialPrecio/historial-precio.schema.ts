import { z } from 'zod';

export const clubIdParamsSchema = z.object({
  clubId: z.string().regex(/^[1-9][0-9]*$/, 'El ID del club debe ser un número válido')
});

export const jornadaIdParamsSchema = z.object({
  jornadaId: z.string().regex(/^[1-9][0-9]*$/, 'El ID de la jornada debe ser un número válido')
});

export type ClubIdParams = z.infer<typeof clubIdParamsSchema>;
export type JornadaIdParams = z.infer<typeof jornadaIdParamsSchema>;