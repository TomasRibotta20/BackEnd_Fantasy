import { z } from 'zod';

export const abrirMercadoSchema = z.object({
  torneoId: z.number().int().positive('El ID del torneo debe ser un número positivo')
});

export const cerrarMercadoParamsSchema = z.object({
  mercadoId: z.string().regex(/^\d+$/, 'El ID del mercado debe ser numérico').transform(Number)
});

export const obtenerMercadoActivoParamsSchema = z.object({
  torneoId: z.string().regex(/^\d+$/, 'El ID del torneo debe ser numérico').transform(Number)
});

export type AbrirMercadoInput = z.infer<typeof abrirMercadoSchema>;