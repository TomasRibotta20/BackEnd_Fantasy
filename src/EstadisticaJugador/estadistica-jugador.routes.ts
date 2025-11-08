import { Router } from 'express';
import { 
  actualizarEstadisticasJornada, 
  getPuntajesPorJornada,
  getPuntajeJugadorPorJornada 
} from './estadistica-jugador.controller.js';

export const estadisticaJugadorRouter = Router();

// Actualizar estadísticas para una jornada
estadisticaJugadorRouter.post('/jornadas/:jornadaId/actualizar', actualizarEstadisticasJornada);

// Obtener puntajes de todos los jugadores para una jornada
estadisticaJugadorRouter.get('/jornadas/:jornadaId/puntajes', getPuntajesPorJornada);

// Obtener puntaje de un jugador específico en una jornada
estadisticaJugadorRouter.get('/jornadas/:jornadaId/jugadores/:jugadorId', getPuntajeJugadorPorJornada);