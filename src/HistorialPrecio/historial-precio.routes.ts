import { Router } from 'express';
import { HistorialPrecioController } from './historial-precio.controller.js';

export const historialPrecioRouter = Router();

// Preview de precios (no guarda en BD)
historialPrecioRouter.get('/preview/:clubId',HistorialPrecioController.previewPreciosPorClub);
// Calcular Y GUARDAR precios de un club
historialPrecioRouter.post('/calcular/:clubId',HistorialPrecioController.calcularYGuardarPreciosClub);

// Calcular Y GUARDAR precios de TODOS los clubes
historialPrecioRouter.post('/calcular-todos',HistorialPrecioController.calcularYGuardarTodosLosClubes);

// Actualizar precios por rendimiento en una jornada
historialPrecioRouter.post('/actualizar-por-rendimiento/:jornadaId', HistorialPrecioController.actualizarPreciosPorRendimiento);