import { Router } from 'express';
import { 
  actualizarEstadisticasJornada, 
  getPuntajesPorJornada,
  getPuntajeJugadorPorJornada 
} from './estadistica-jugador.controller.js';
import { requireAdmin, requireAuth } from '../Auth/auth.requires.js';
import { jornadaIdParamsSchema, jornadaJugadorParamsSchema } from './estadistica-jugador.schema.js';
import { validateParams } from '../shared/zod/validate.js';

export const estadisticaJugadorRouter = Router();

estadisticaJugadorRouter.post('/jornadas/:jornadaId/actualizar', requireAdmin, validateParams(jornadaIdParamsSchema), actualizarEstadisticasJornada);
estadisticaJugadorRouter.get('/jornadas/:jornadaId/puntajes', requireAuth, validateParams(jornadaIdParamsSchema), getPuntajesPorJornada);
estadisticaJugadorRouter.get('/jornadas/:jornadaId/jugadores/:jugadorId', requireAuth, validateParams(jornadaJugadorParamsSchema), getPuntajeJugadorPorJornada);