import { Request, Response } from 'express';
import { orm } from '../shared/db/orm.js';
import { EstadisticaJugadorService } from './estadistica-jugador.service.js';
import { ErrorFactory } from '../shared/errors/errors.factory.js';

export async function actualizarEstadisticasJornada(req: Request, res: Response) {
  try {
    const jornadaId = Number(req.params.jornadaId);
    
    if (isNaN(jornadaId)) {
      throw ErrorFactory.badRequest('El ID de jornada no es válido');
    }
    
    const em = orm.em.fork();
    const partidosProcesados = await EstadisticaJugadorService.actualizarEstadisticasJornada(em, jornadaId);
    
    return res.status(200).json({
      message: `Estadísticas actualizadas correctamente para ${partidosProcesados} partidos de la jornada ${jornadaId}`
    });
  } catch (error) {
    console.error('Error al actualizar estadísticas:', error);
    if (error instanceof Error) {
      return res.status(500).json({ message: `Error: ${error.message}` });
    }
    return res.status(500).json({ message: 'Error desconocido al actualizar estadísticas' });
  }
}

export async function getPuntajesPorJornada(req: Request, res: Response) {
  try {
    const jornadaId = Number(req.params.jornadaId);
    
    if (isNaN(jornadaId)) {
      throw ErrorFactory.badRequest('El ID de jornada no es válido');
    }
    
    const em = orm.em.fork();
    const estadisticas = await EstadisticaJugadorService.getPuntajesPorJornada(em, jornadaId);
    
    return res.status(200).json({
      message: `Puntajes para la jornada ${jornadaId}`,
      count: estadisticas.length,
      data: estadisticas
    });
  } catch (error) {
    console.error('Error al obtener puntajes:', error);
    if (error instanceof Error) {
      return res.status(500).json({ message: `Error: ${error.message}` });
    }
    return res.status(500).json({ message: 'Error desconocido al obtener puntajes' });
  }
}

export async function getPuntajeJugadorPorJornada(req: Request, res: Response) {
  try {
    const jornadaId = Number(req.params.jornadaId);
    const jugadorId = Number(req.params.jugadorId);
    
    if (isNaN(jornadaId) || isNaN(jugadorId)) {
      throw ErrorFactory.badRequest('ID de jornada o jugador no válido');
    }
    
    const em = orm.em.fork();
    const estadistica = await EstadisticaJugadorService.getPuntajeJugadorPorJornada(em, jugadorId, jornadaId);
    
    if (!estadistica) {
      return res.status(404).json({
        message: `No se encontró puntaje para el jugador ${jugadorId} en la jornada ${jornadaId}`
      });
    }
    
    return res.status(200).json({
      message: `Puntaje del jugador ${jugadorId} en la jornada ${jornadaId}`,
      data: estadistica
    });
  } catch (error) {
    console.error('Error al obtener puntaje de jugador:', error);
    if (error instanceof Error) {
      return res.status(500).json({ message: `Error: ${error.message}` });
    }
    return res.status(500).json({ message: 'Error desconocido al obtener puntaje de jugador' });
  }
}