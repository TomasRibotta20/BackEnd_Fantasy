import { Router } from 'express';
import { HistorialPrecioController } from './historial-precio.controller.js';
import { clubIdParamsSchema, jornadaIdParamsSchema } from './historial-precio.schema.js';
import { validateParams } from '../shared/zod/validate.js';
import { requireAuth } from '../Auth/auth.requires.js';

export const historialPrecioRouter = Router();

historialPrecioRouter.get('/preview/:clubId', requireAuth, validateParams(clubIdParamsSchema), HistorialPrecioController.previewPreciosPorClub);
historialPrecioRouter.post('/calcular/:clubId', requireAuth, validateParams(clubIdParamsSchema), HistorialPrecioController.calcularYGuardarPreciosClub);
historialPrecioRouter.post('/calcular-todos', requireAuth, HistorialPrecioController.calcularYGuardarTodosLosClubes);
historialPrecioRouter.post('/actualizar-por-rendimiento/:jornadaId', requireAuth, validateParams(jornadaIdParamsSchema), HistorialPrecioController.actualizarPreciosPorRendimiento);