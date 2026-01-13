import { Request, Response } from 'express';
import { orm } from '../shared/db/orm.js';
import { EstadisticaJugadorService } from './estadistica-jugador.service.js';
import { ErrorFactory } from '../shared/errors/errors.factory.js';

export async function actualizarEstadisticasJornada(req: Request, res: Response, next: Function) {  
  try {
    const em = orm.em;
    const jornadaId = Number(req.params.jornadaId);
    const partidosProcesados = await EstadisticaJugadorService.actualizarEstadisticasJornada(em, jornadaId);
    res.status(200).json({
      message: `Estadísticas actualizadas correctamente para ${partidosProcesados} partidos de la jornada ${jornadaId}`
    });
  } catch (error: any) {
    if (error instanceof Error) {
      next(error);
    } else {
      next(ErrorFactory.internal('Error al actualizar las estadísticas de la jornada'));
    }
  }
}

export async function getPuntajesPorJornada(req: Request, res: Response, next: Function) {
  try {
    const em = orm.em;
    const jornadaId = Number(req.params.jornadaId);
    const estadisticas = await EstadisticaJugadorService.getPuntajesPorJornada(em, jornadaId);
    
    res.status(200).json({
      message: `Puntajes para la jornada ${jornadaId}`,
      count: estadisticas.length,
      data: estadisticas
    });
  } catch (error: any) {
    if (error instanceof Error) {
      next(error);
    } else {
      next(ErrorFactory.internal('Error al obtener los puntajes de la jornada'));
    }
  }
}

export async function getPuntajeJugadorPorJornada(req: Request, res: Response, next: Function) {
  try {
    const em = orm.em;
    const jornadaId = Number(req.params.jornadaId);
    const jugadorId = Number(req.params.jugadorId);
    const estadistica = await EstadisticaJugadorService.getPuntajeJugadorPorJornada(em, jugadorId, jornadaId); 
    if (!estadistica) {
      throw ErrorFactory.notFound('No se encontró estadística para el jugador en la jornada especificada');
    }
    res.status(200).json({
      message: `Puntaje del jugador ${jugadorId} en la jornada ${jornadaId}`,
      data: estadistica
    });
  } catch (error: any) {
    if (error instanceof Error) {
      next(error);
    } else {
      next(ErrorFactory.internal('Error al obtener el puntaje del jugador en la jornada'));
    }
  }
}