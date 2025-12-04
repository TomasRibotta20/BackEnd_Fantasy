import { z } from 'zod';

export const createTorneoSchema = z.object({
  nombre: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  nombre_equipo: z.string().min(1, 'Nombre del equipo requerido').max(50, 'Nombre muy largo'),
  descripcion: z.string().optional(),
  cupoMaximo: z.number().min(1, 'El cupo máximo debe ser al menos 1').max(10, 'El cupo máximo no puede ser mayor a 10'),
  fecha_inicio: z.string().optional()
});

export const updateTorneoSchema = z.object({
  nombre: z.string().min(3, 'El nombre debe tener al menos 3 caracteres').optional(),
  descripcion: z.string().optional(),
  cupoMaximo: z.number().min(1, 'El cupo máximo debe ser al menos 1').max(10, 'El cupo máximo no puede ser mayor a 10').optional(),
  fecha_inicio: z.string().optional(),
  codigo_acceso: z.string().min(1, 'Código de acceso requerido').optional()
}).refine(obj => Object.keys(obj).length > 0, {
  message: 'Se debe enviar al menos un campo para actualizar',
});

export const idTorneoParamsSchema = z.object({
  id: z.string().regex(/^\d+$/, 'El ID debe ser un número válido')
});

export const torneoQuerySchema = z.object({
  estado: z.enum(['EN_ESPERA', 'ACTIVO', 'FINALIZADO']).optional(),
  fecha_creacion_desde: z.string().datetime('Fecha debe estar en formato ISO').optional(), // ✅ Mejor validación
  fecha_creacion_hasta: z.string().datetime('Fecha debe estar en formato ISO').optional(),
  min_participantes: z.string().regex(/^\d+$/).transform(val => Number(val)).refine(val => val >= 0).optional(),
  max_participantes: z.string().regex(/^\d+$/).transform(val => Number(val)).refine(val => val >= 1).optional(),
  limit: z.string().regex(/^\d+$/).transform(val => Number(val)).refine(val => val >= 1 && val <= 100).optional(),
  offset: z.string().regex(/^\d+$/).transform(val => Number(val)).refine(val => val >= 0).optional(),
});

export const validateAccessCodeSchema = z.object({
  codigo_acceso: z.string().min(1, 'Código de acceso requerido')
});

export const joinTorneoSchema = z.object({
  codigo_acceso: z.string().min(1, 'Código de acceso requerido'),
  nombre_equipo: z.string().min(1, 'Nombre del equipo requerido').max(50, 'Nombre muy largo')
});

export const misTorneosQuerySchema = z.object({
  estado: z.enum(['EN_ESPERA', 'ACTIVO']).optional()
}).optional();

export type CreateTorneoInput = z.infer<typeof createTorneoSchema>;
export type UpdateTorneoInput = z.infer<typeof updateTorneoSchema>;
export type IdTorneoParams = z.infer<typeof idTorneoParamsSchema>;
export type TorneoQuery = z.infer<typeof torneoQuerySchema>;
export type ValidateAccessCodeInput = z.infer<typeof validateAccessCodeSchema>;
export type JoinTorneoInput = z.infer<typeof joinTorneoSchema>;
export type MisTorneosQuery = z.infer<typeof misTorneosQuerySchema>;