import { Request, Response, NextFunction } from 'express'
import { orm } from '../db/orm.js'
import { GameConfig } from '../../Config/gameConfig.entity.js'

export async function verificarModificacionesHabilitadas(
  req: Request, 
  res: Response, 
  next: NextFunction
) {
  try {
    const em = orm.em.fork()
    const config = await em.findOne(GameConfig, 1)

    // Si no hay config, permitir por defecto
    if (!config) {
      return next()
    }

    // Si están deshabilitadas, bloquear
    if (!config.modificacionesHabilitadas) {
      return res.status(403).json({
        success: false,
        message: 'Las modificaciones están deshabilitadas. La jornada está en curso.',
        type: 'MODIFICACIONES_DESHABILITADAS',
        timestamp: new Date().toISOString()
      })
    }

    // Si están habilitadas, continuar
    next()
  } catch (error) {
    console.error('Error verificando modificaciones:', error)
    // En caso de error, permitir por defecto
    next()
  }
}