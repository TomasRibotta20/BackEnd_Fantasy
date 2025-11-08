import { NextFunction, Request, Response } from 'express'
import { orm } from '../shared/db/orm.js'
import { GameConfig } from '../Config/gameConfig.entity.js'
import { Jornada } from '../Fixture/Jornada.entity.js'
import { EquipoSnapshotService } from '../Equipo/equipoSnapshot.service.js'
import { EstadisticaJugadorService } from '../EstadisticaJugador/estadistica-jugador.service.js'
import { EquipoJornada } from '../Equipo/equipoJornada.entity.js'
import {ErrorFactory} from "../shared/errors/errors.factory.js";

class AdminController {
  // Establecer jornada activa
  async setJornadaActiva(req: Request, res: Response, next: NextFunction) {
    try {
      const { jornadaId } = req.body
      const em = orm.em.fork()

      // Verificar que la jornada existe
      const jornada = await em.findOne(Jornada, Number(jornadaId))
      if (!jornada) {
        return next(ErrorFactory.notFound('Jornada no encontrada'))
      }

      // Obtener o crear config
      let config = await em.findOne(GameConfig, 1)
      if (!config) {
        config = em.create(GameConfig, {
          jornadaActiva: jornada,
          modificacionesHabilitadas: true,
          updatedAt: new Date()
        })
      } else {
        config.jornadaActiva = jornada
        config.updatedAt = new Date()
      }

      await em.persistAndFlush(config)

      res.json({
        success: true,
        message: `Jornada ${jornada.nombre} establecida como activa`,
        data: config
      })
    } catch (error: any) {
        next(ErrorFactory.internal("Error al establecer jornada activa"));
      }
    }


  // Habilitar modificaciones
  async habilitarModificaciones(req: Request, res: Response, next: NextFunction) {
    try {
      const em = orm.em.fork()

      let config = await em.findOne(GameConfig, 1)
      if (!config) {
        config = em.create(GameConfig, {
          modificacionesHabilitadas: true,
          updatedAt: new Date()
        })
      } else {
        config.modificacionesHabilitadas = true
        config.updatedAt = new Date()
      }

      await em.persistAndFlush(config)

      res.json({
        success: true,
        message: 'Modificaciones habilitadas para todos los usuarios'
      })
    } catch (error: any) {
        next(ErrorFactory.internal("Error al habilitar modificaciones"));
    }
  }

  // Deshabilitar modificaciones
  async deshabilitarModificaciones(req: Request, res: Response, next: NextFunction) {
    try {
      const em = orm.em.fork()

      let config = await em.findOne(GameConfig, 1)
      if (!config) {
        config = em.create(GameConfig, {
          modificacionesHabilitadas: false,
          updatedAt: new Date()
        })
      } else {
        config.modificacionesHabilitadas = false
        config.updatedAt = new Date()
      }

      await em.persistAndFlush(config)

      res.json({
        success: true,
        message: 'Modificaciones deshabilitadas para todos los usuarios'
      })
    } catch (error: any) {
        next(ErrorFactory.internal("Error al deshabilitar modificaciones"));
    }
  }

  // Ver configuración actual
  async getConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const em = orm.em.fork()
      const config = await em.findOne(GameConfig, 1, { populate: ['jornadaActiva'] })

      if (!config) {
        return next(ErrorFactory.notFound('No hay configuración establecida'))
      }

      res.json({
        success: true,
        data: config
      })
    } catch (error: any) {
        next(ErrorFactory.internal("Error al obtener configuración"));
    }
  }

  async procesarJornada(req: Request, res: Response, next: NextFunction) {
    const jornadaId = Number(req.params.jornadaId)
    const { activarJornada = true } = req.body
    const em = orm.em.fork()
    try {     
      // 1. Verificar que las modificaciones estén deshabilitadas
      const config = await em.findOne(GameConfig, 1)
      if (!config || config.modificacionesHabilitadas) {
        return next(ErrorFactory.validationAppError('Debes deshabilitar las modificaciones antes de procesar la jornada'))
      }

      // 2. Verificar que la jornada exista
      const jornada = await em.findOne(Jornada, jornadaId)
      if (!jornada) {
        return next(ErrorFactory.notFound('Jornada no encontrada'))
      }

      // 3. Crear snapshots de todos los equipos
      const snapshotService = new EquipoSnapshotService(em)
      await snapshotService.crearSnapshotsJornada(jornadaId)

      // 4. Obtener datos de la API externa
      await EstadisticaJugadorService.actualizarEstadisticasJornada(em, jornadaId)

      // 5. Calcular puntajes para todos los equipos
      await snapshotService.calcularPuntajesJornada(jornadaId)
      // 6. Activar jornada (si se solicitó)
      if (activarJornada) {
        console.log('\nPASO 4: Activando jornada...')
        config.jornadaActiva = jornada
        config.updatedAt = new Date()
        await em.flush()
        console.log(`✓ Jornada "${jornada.nombre}" establecida como activa`)
      }

      res.json({
        success: true,
        message: `Jornada ${jornada.nombre} procesada exitosamente`,
        data: {
          jornadaNombre: jornada.nombre,
          snapshotsCreados: true,
          puntajesCalculados: true,
          jornadaActivada: activarJornada,
        },
      })
    } catch (error: any) {
        return next(ErrorFactory.internal("Error desconocido al procesar jornada"))
    }
  }
  async recalcularPuntajesJornada(req: Request, res: Response,next : NextFunction) {
  const jornadaId = Number(req.params.jornadaId)
  const em = orm.em.fork()

  try {
    console.log(`\nRecalculando puntajes de jornada ${jornadaId}`)

    // Verificar que la jornada exista
    const jornada = await em.findOne(Jornada, jornadaId)
    if (!jornada) {
        return next(ErrorFactory.notFound('Jornada no encontrada'))
    }

    // Verificar que existan snapshots
    const snapshots = await em.count(EquipoJornada, { jornada: jornadaId })
    if (snapshots === 0) {
        return next(ErrorFactory.validationAppError('No hay snapshots para esta jornada. Debes procesarla primero.'))
    }

    // Usar el método existente
    const snapshotService = new EquipoSnapshotService(em)
    await snapshotService.calcularPuntajesJornada(jornadaId)

    console.log('\nPUNTAJES RECALCULADOS EXITOSAMENTE\n')

    return res.json({
      success: true,
      message: `Puntajes de jornada "${jornada.nombre}" recalculados exitosamente`,
      data: {
        jornadaId: jornada.id,
        jornadaNombre: jornada.nombre,
        equiposActualizados: snapshots,
      },
    })
  } catch (error: any) {
    console.error('\nERROR recalculando puntajes:', error)
    return next(ErrorFactory.internal("Error desconocido al recalcular puntajes"))
  }
}
}


export const adminController = new AdminController()