import { z } from 'zod';

// Schema para validar el clubId en params
export const clubIdParamsSchema = z.object({
  clubId: z.string().regex(/^[1-9][0-9]*$/, 'El ID del club debe ser un número válido')
});

// Schema para validar el jornadaId en params
export const jornadaIdParamsSchema = z.object({
  jornadaId: z.string().regex(/^[1-9][0-9]*$/, 'El ID de la jornada debe ser un número válido')
});

// Types para TypeScript
export type ClubIdParams = z.infer<typeof clubIdParamsSchema>;
export type JornadaIdParams = z.infer<typeof jornadaIdParamsSchema>;