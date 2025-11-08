import { Request, Response, NextFunction } from 'express'
import { orm } from '../shared/db/orm.js'
import { EquipoSnapshotService } from './equipoSnapshot.service.js'
import { ErrorFactory } from '../shared/errors/errors.factory.js'

export async function getHistorial(req: Request, res: Response, next: NextFunction) {
  try {
    const equipoId = Number(req.params.equipoId)
    const em = orm.em.fork()

    const snapshotService = new EquipoSnapshotService(em)
    const historial = await snapshotService.obtenerHistorialEquipo(equipoId)

    return res.status(200).json({
      message: 'Historial obtenido',
      data: historial,
    })
  } catch (error) {
    return next(ErrorFactory.internal('Error al obtener el historial del equipo'))
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
      return next(ErrorFactory.notFound('No se encontró registro para esta jornada'))
    }

    return res.status(200).json({
      message: 'Equipo en jornada obtenido',
      data: resultado,
    })
  } catch (error) {
    return next(error)
  }
}

export async function getRankingJornada(req: Request, res: Response, next: NextFunction) {
  try {
    const jornadaId = Number(req.params.jornadaId)
    const em = orm.em.fork()

    const snapshotService = new EquipoSnapshotService(em)
    const ranking = await snapshotService.obtenerRankingJornada(jornadaId)

    return res.status(200).json({
      message: 'Ranking obtenido',
      data: ranking,
    })
  } catch (error) {
    return next(ErrorFactory.internal('Error al obtener el ranking de la jornada'))
  }
}