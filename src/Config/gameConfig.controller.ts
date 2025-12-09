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
 /**
   * Obtiene o crea la configuración del juego
   */
  private async getOrCreateConfig(em: any): Promise<GameConfig> {
    let config = await em.findOne(GameConfig, 1, { populate: ['jornadaActiva'] });
    
    if (!config) {
      // Crear configuración por defecto
      config = em.create(GameConfig, {
        modificacionesHabilitadas: true,
        cupoMaximoTorneos: 5,
        dias_proteccion_clausula: 2,
        ratio_blindaje_clausula: 2,
        updatedAt: new Date()
      });
      await em.persistAndFlush(config);
      console.log('✅ Configuración del juego creada por defecto');
    }
    
    return config;
  }

   /**
   * Obtener todas las configuraciones del juego
   */
  async getConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const em = orm.em.fork()
      const config = await this.getOrCreateConfig(em);

      res.json({
        success: true,
        data: {
          id: config.id,
          jornadaActiva: config.jornadaActiva,
          modificacionesHabilitadas: config.modificacionesHabilitadas,
          cupoMaximoTorneos: config.cupoMaximoTorneos,
          dias_proteccion_clausula: config.dias_proteccion_clausula,
          ratio_blindaje_clausula: config.ratio_blindaje_clausula,
          updatedAt: config.updatedAt
        }
      })
    } catch (error: any) {
      next(ErrorFactory.internal("Error al obtener configuración"));
    }
  }
  /**
   * Obtener configuraciones de cláusulas
   */
  async getConfigClausulas(req: Request, res: Response, next: NextFunction) {
    try {
      const em = orm.em.fork()
      const config = await this.getOrCreateConfig(em);

      res.json({
        success: true,
        data: {
          dias_proteccion_clausula: config.dias_proteccion_clausula,
          ratio_blindaje_clausula: config.ratio_blindaje_clausula,
          mensaje: `Protección: ${config.dias_proteccion_clausula} días | Ratio blindaje: 1:${config.ratio_blindaje_clausula}`
        }
      })
    } catch (error: any) {
      next(ErrorFactory.internal("Error al obtener configuración de cláusulas"));
    }
  }
}

export const gameConfigController = new GameConfigController()