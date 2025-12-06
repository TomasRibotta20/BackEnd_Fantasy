import { Router } from 'express';
import { HistorialPrecioController } from './historial-precio.controller.js';
import { clubIdParamsSchema, jornadaIdParamsSchema } from './historial-precio.schema.js';
import { validateParams } from '../shared/zod/validate.js';
import { requireAuth } from '../Auth/auth.requires.js';

export const historialPrecioRouter = Router();

// Preview de precios (no guarda en BD)
historialPrecioRouter.get('/preview/:clubId', requireAuth, validateParams(clubIdParamsSchema), HistorialPrecioController.previewPreciosPorClub);
// Calcular Y GUARDAR precios de un club
historialPrecioRouter.post('/calcular/:clubId', requireAuth, validateParams(clubIdParamsSchema), HistorialPrecioController.calcularYGuardarPreciosClub);
// Calcular Y GUARDAR precios de TODOS los clubes
historialPrecioRouter.post('/calcular-todos', requireAuth, HistorialPrecioController.calcularYGuardarTodosLosClubes);
// Actualizar precios por rendimiento en una jornada
historialPrecioRouter.post('/actualizar-por-rendimiento/:jornadaId', requireAuth, validateParams(jornadaIdParamsSchema), HistorialPrecioController.actualizarPreciosPorRendimiento);