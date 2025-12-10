import { Request, Response, NextFunction } from 'express'
import { orm } from '../shared/db/orm.js'
import { EquipoSnapshotService } from './equipoSnapshot.service.js'
import { AppError, ErrorFactory } from '../shared/errors/errors.factory.js'

export async function getHistorial(req: Request, res: Response, next: NextFunction) {
  try {
    const equipoId = Number(req.params.equipoId)
    const em = orm.em.fork()

    const snapshotService = new EquipoSnapshotService(em)
    const historial = await snapshotService.obtenerHistorialEquipo(equipoId)

    res.status(200).json({
      message: 'Historial obtenido',
      data: historial,
    })
  } catch (error: any) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(ErrorFactory.internal('Error al obtener el historial del equipo'));
    }
  }
}

export async function getEquipoEnJornada(req: Request, res: Response, next: NextFunction) {
  try {
    const equipoId = Number(req.params.equipoId)
    const jornadaId = Number(req.params.jornadaId)
    const em = orm.em.fork()

    const snapshotService = new EquipoSnapshotService(em)
    const resultado = await snapshotService.obtenerEquipoEnJornada(equipoId, jornadaId)

    if (!resultado) {
      throw ErrorFactory.notFound('No se encontró registro para esta jornada');
    }

    res.status(200).json({
      message: 'Equipo en jornada obtenido',
      data: resultado,
    })
  } catch (error: any) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(ErrorFactory.internal('Error al obtener el equipo en la jornada'));
    }
  }
}

export async function getRankingTorneoJornada(req: Request, res: Response, next: NextFunction) {
  try {
    const jornadaId = Number(req.params.jornadaId)
    const torneoId = Number(req.params.torneoId)
    const em = orm.em.fork()

    const snapshotService = new EquipoSnapshotService(em)
    const ranking = await snapshotService.obtenerRankingJornadaPorTorneo(torneoId, jornadaId)

    res.status(200).json({
      message: 'Ranking obtenido',
      data: ranking,
    })
  } catch (error: any) {
    if (error instanceof AppError) {
      next(error)
    } else {
      next(ErrorFactory.internal('Error al obtener el ranking del torneo en la jornada'))
    }
  }
}