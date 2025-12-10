import { z } from 'zod';

export const inicializarJugadoresSchema = z.object({
  torneoId: z.number().int().positive('El ID del torneo debe ser un número positivo')
});

export const abrirMercadoSchema = z.object({
  torneoId: z.number().int().positive('El ID del torneo debe ser un número positivo')
});

export const cerrarMercadoParamsSchema = z.object({
  mercadoId: z.string().regex(/^[1-9][0-9]*$/, 'El ID del mercado debe ser un número válido')
});

export const obtenerMercadoActivoParamsSchema = z.object({
  torneoId: z.string().regex(/^[1-9][0-9]*$/, 'El ID del torneo debe ser un número válido')
});

export type InicializarJugadoresInput = z.infer<typeof inicializarJugadoresSchema>;
export type AbrirMercadoInput = z.infer<typeof abrirMercadoSchema>;
export type CerrarMercadoParams = z.infer<typeof cerrarMercadoParamsSchema>;
export type ObtenerMercadoActivoParams = z.infer<typeof obtenerMercadoActivoParamsSchema>;