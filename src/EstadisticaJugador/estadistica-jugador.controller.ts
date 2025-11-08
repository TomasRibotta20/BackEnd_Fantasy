import { Request, Response } from 'express';
import { orm } from '../shared/db/orm.js';
import { EstadisticaJugadorService } from './estadistica-jugador.service.js';
import { ErrorFactory } from '../shared/errors/errors.factory.js';

export async function actualizarEstadisticasJornada(req: Request, res: Response, next: Function) {
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
  } catch (error: any) {
    return next(ErrorFactory.internal('Error al actualizar estadísticas de la jornada'));
  }
}

export async function getPuntajesPorJornada(req: Request, res: Response, next: Function) {
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
  } catch (error: any) {
    return next(ErrorFactory.internal('Error al obtener puntajes de la jornada'));
  }
}

export async function getPuntajeJugadorPorJornada(req: Request, res: Response, next: Function) {
  try {
    const jornadaId = Number(req.params.jornadaId);
    const jugadorId = Number(req.params.jugadorId);
    
    if (isNaN(jornadaId) || isNaN(jugadorId)) {
      throw ErrorFactory.badRequest('ID de jornada o jugador no válido');
    }
    
    const em = orm.em.fork();
    const estadistica = await EstadisticaJugadorService.getPuntajeJugadorPorJornada(em, jugadorId, jornadaId);
    
    if (!estadistica) {
      return next(ErrorFactory.notFound('No se encontró estadística para el jugador en la jornada especificada'));
    }
    
    return res.status(200).json({
      message: `Puntaje del jugador ${jugadorId} en la jornada ${jornadaId}`,
      data: estadistica
    });
  } catch (error) {
    return next(ErrorFactory.internal('Error al obtener puntaje del jugador en la jornada'));
  }
}