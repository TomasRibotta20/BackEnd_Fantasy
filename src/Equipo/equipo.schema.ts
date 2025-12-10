import { z } from 'zod';

export const equipoIdParamsSchema = z.object({
  equipoId: z.string().regex(/^[1-9][0-9]*$/, 'El ID del equipo debe ser un número válido')
});

export const equipoJornadaParamsSchema = z.object({
  equipoId: z.string().regex(/^[1-9][0-9]*$/, 'El ID del equipo debe ser un número válido'),
  jornadaId: z.string().regex(/^[1-9][0-9]*$/, 'El ID de jornada debe ser un número válido')
});

export const intercambioJugadorSchema = z.object({
  jugadorSaleId: z.number().int().positive('El ID del jugador que sale debe ser un número positivo'),
  jugadorEntraId: z.number().int().positive('El ID del jugador que entra debe ser un número positivo')
});

export const cambiarAlineacionSchema = z.object({
  jugadorTitularId: z.number().int().positive('El ID del jugador titular debe ser un número positivo'),
  jugadorSuplenteId: z.number().int().positive('El ID del jugador suplente debe ser un número positivo')
});

export const cambiarEstadoSchema = z.object({
  jugadorId: z.number().int().positive('El ID del jugador debe ser un número positivo')
});

export const venderJugadorSchema = z.object({
  jugadorId: z.number().int().positive('El ID del jugador debe ser un número positivo')
});

export type EquipoIdParams = z.infer<typeof equipoIdParamsSchema>;
export type EquipoJornadaParams = z.infer<typeof equipoJornadaParamsSchema>;
export type IntercambioJugadorInput = z.infer<typeof intercambioJugadorSchema>;
export type CambiarAlineacionInput = z.infer<typeof cambiarAlineacionSchema>;
export type CambiarEstadoInput = z.infer<typeof cambiarEstadoSchema>;
export type VenderJugadorInput = z.infer<typeof venderJugadorSchema>;