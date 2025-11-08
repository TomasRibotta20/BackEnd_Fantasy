import { NextFunction, Request, Response } from 'express'
import { orm } from '../shared/db/orm.js'
import { GameConfig } from './gameConfig.entity.js'
import { ErrorFactory } from '../shared/errors/errors.factory.js'

class GameConfigController {
  // Obtener jornada activa 
  async getJornadaActiva(req: Request, res: Response,next: NextFunction) {
    try {
      const em = orm.em.fork()
      const config = await em.findOne(GameConfig, 1, { populate: ['jornadaActiva'] })

      if (!config || !config.jornadaActiva) {
        return next(ErrorFactory.notFound('No hay jornada activa configurada'))
      }

      res.json({
        success: true,
        data: {
          jornada: config.jornadaActiva,
          modificacionesHabilitadas: config.modificacionesHabilitadas
        }
      })
    } catch (error: any) {
      next(ErrorFactory.internal("Error al obtener jornada activa"));
    }
  }

  // Verificar estado de modificaciones
  async getEstadoModificaciones(req: Request, res: Response, next:NextFunction) {
    try {
      const em = orm.em.fork()
      const config = await em.findOne(GameConfig, 1)

      if (!config) {
        return res.json({
          success: true,
          data: {
            modificacionesHabilitadas: true,
            mensaje: 'Modificaciones habilitadas por defecto'
          }
        })
      }

      res.json({
        success: true,
        data: {
          modificacionesHabilitadas: config.modificacionesHabilitadas,
          mensaje: config.modificacionesHabilitadas 
            ? 'Puedes modificar tu equipo' 
            : 'Las modificaciones están deshabilitadas'
        }
      })
    } catch (error: any) {
      next(ErrorFactory.internal("Error al obtener estado de modificaciones"));
    }
  }
}

export const gameConfigController = new GameConfigController()