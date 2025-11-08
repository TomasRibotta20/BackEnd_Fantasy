import { Request, Response } from 'express'
import { orm } from '../shared/db/orm.js'
import { GameConfig } from './gameConfig.entity.js'

class GameConfigController {
  // Obtener jornada activa 
  async getJornadaActiva(req: Request, res: Response) {
    try {
      const em = orm.em.fork()
      const config = await em.findOne(GameConfig, 1, { populate: ['jornadaActiva'] })

      if (!config || !config.jornadaActiva) {
        return res.status(404).json({
          success: false,
          message: 'No hay jornada activa configurada'
        })
      }

      res.json({
        success: true,
        data: {
          jornada: config.jornadaActiva,
          modificacionesHabilitadas: config.modificacionesHabilitadas
        }
      })
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      })
    }
  }

  // Verificar estado de modificaciones
  async getEstadoModificaciones(req: Request, res: Response) {
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
      res.status(500).json({
        success: false,
        message: error.message
      })
    }
  }
}

export const gameConfigController = new GameConfigController()