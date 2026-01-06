import { NextFunction, Request, Response } from 'express'
import { orm } from '../shared/db/orm.js'
import { GameConfig } from '../Config/gameConfig.entity.js'
import { Jornada } from '../Fixture/Jornada.entity.js'
import { EquipoSnapshotService } from '../Equipo/equipoSnapshot.service.js'
import { EstadisticaJugadorService } from '../EstadisticaJugador/estadistica-jugador.service.js'
import { EquipoJornada } from '../Equipo/equipoJornada.entity.js'
import {ErrorFactory} from "../shared/errors/errors.factory.js";
import { HistorialPrecioService } from '../HistorialPrecio/historial-precio.service.js';
import { generarRecompensasFinJornada } from '../Recompensa/recompensa.service.js'
class AdminController {
  /**
   * Método auxiliar para obtener o crear la configuración
   */
  private async getOrCreateConfig(em: any): Promise<GameConfig> {
    let config = await em.findOne(GameConfig, 1, { populate: ['jornadaActiva'] })
    
    if (!config) {
      config = em.create(GameConfig, {
        modificacionesHabilitadas: true,
        cupoMaximoTorneos: 5,
        dias_proteccion_clausula: 2,
        ratio_blindaje_clausula: 2,
        max_jugadores_por_equipo: 15,
        updatedAt: new Date()
      })
      await em.persistAndFlush(config);
    }
    
    return config
  }

  /**
   * Actualizar configuración del juego (ADMIN)
   * Permite actualizar múltiples campos de configuración a la vez
   */
  async updateConfig(req: Request, res: Response, next: NextFunction) {
    try {
      console.log('=== INICIO updateConfig ===')
      console.log('Body recibido:', req.body)
      const { 
        jornadaId,
        modificacionesHabilitadas,
        cupoMaximoTorneos,
        dias_proteccion_clausula,
        ratio_blindaje_clausula,
        max_jugadores_por_equipo
      } = req.body
      console.log('Parámetros extraídos:', {
      jornadaId,
      modificacionesHabilitadas,
      cupoMaximoTorneos,
      dias_proteccion_clausula,
      ratio_blindaje_clausula,
      max_jugadores_por_equipo
      })
      console.log('Creando EntityManager...')
      const em = orm.em.fork()
      console.log('Obteniendo configuración...')
      const config = await this.getOrCreateConfig(em)
      console.log('Configuración obtenida:', {
      id: config.id,
      max_jugadores_por_equipo_actual: config.max_jugadores_por_equipo
    })
      // Actualizar jornada activa si se proporciona
      if (jornadaId !== undefined) {
        const jornada = await em.findOne(Jornada, Number(jornadaId))
        if (!jornada) {
          return next(ErrorFactory.notFound('Jornada no encontrada'))
        }
        config.jornada_activa = jornada
      }

      // Actualizar estado de modificaciones
      if (modificacionesHabilitadas !== undefined) {
        if (typeof modificacionesHabilitadas !== 'boolean') {
          return next(ErrorFactory.badRequest('modificacionesHabilitadas debe ser un booleano'))
        }
        config.modificaciones_habilitadas = modificacionesHabilitadas
      }

      // Actualizar cupo máximo de torneos
      if (cupoMaximoTorneos !== undefined) {
        if (cupoMaximoTorneos < 1) {
          return next(ErrorFactory.badRequest('El cupo máximo debe ser al menos 1'))
        }
        if (cupoMaximoTorneos > 10) {
          return next(ErrorFactory.badRequest('El cupo máximo no puede exceder 10 participantes'))
        }
        config.cupo_maximo_torneos = cupoMaximoTorneos
      }

      // Actualizar días de protección de cláusula
      if (dias_proteccion_clausula !== undefined) {
        console.log('Actualizando dias_proteccion_clausula...')
        if (dias_proteccion_clausula < 0 || dias_proteccion_clausula > 14) {
          return next(ErrorFactory.badRequest('Los días de protección deben estar entre 0 y 14'))
        }
        config.dias_proteccion_clausula = dias_proteccion_clausula
        console.log('dias_proteccion_clausula actualizado')
      }

      // Actualizar ratio de blindaje de cláusula
      if (ratio_blindaje_clausula !== undefined) {
        if (ratio_blindaje_clausula < 1 || ratio_blindaje_clausula > 5) {
          return next(ErrorFactory.badRequest('El ratio de blindaje debe estar entre 1 y 5'))
        }
        config.ratio_blindaje_clausula = ratio_blindaje_clausula
      }

      // Actualizar máximo de jugadores por equipo
      if (max_jugadores_por_equipo !== undefined) {
        if (max_jugadores_por_equipo < 11) {
          return next(ErrorFactory.badRequest('El máximo de jugadores por equipo debe ser al menos 11'))
        }
        if (max_jugadores_por_equipo > 25) {
          return next(ErrorFactory.badRequest('El máximo de jugadores por equipo no puede exceder 25'))
        }
        config.max_jugadores_por_equipo = max_jugadores_por_equipo
      }
      console.log('Actualizando updatedAt...')
      config.updated_at = new Date()
      console.log('Persistiendo cambios...')
      await em.persistAndFlush(config)
      console.log('Cambios persistidos exitosamente')
      console.log('Preparando respuesta...')
      res.json({
        success: true,
        message: 'Configuración actualizada exitosamente',
        data: {
          id: config.id,
          jornada_activa: config.jornada_activa ? {
            id: config.jornada_activa.id,
            nombre: config.jornada_activa.nombre
          } : null,
          modificaciones_habilitadas: config.modificaciones_habilitadas,
          cupo_maximo_torneos: config.cupo_maximo_torneos,
          dias_proteccion_clausula: config.dias_proteccion_clausula,
          ratio_blindaje_clausula: config.ratio_blindaje_clausula,
          max_jugadores_por_equipo: config.max_jugadores_por_equipo,
          updatedAt: config.updated_at
        }
      })
    } catch (error: any) {
      console.error('=== ERROR EN updateConfig ===')
      console.error('Tipo de error:', error.constructor.name)
      console.error('Mensaje:', error.message)
      console.error('Stack:', error.stack)
      console.error('Error completo:', error)
      next(ErrorFactory.internal("Error al actualizar configuración"));
    }
  }

  /**
   * Obtener configuración actual (ADMIN)
   */
  async getConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const em = orm.em.fork()
      const config = await em.findOne(GameConfig, 1, { populate: ['jornada_activa'] })

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
      if (!config || config.modificaciones_habilitadas) {
        return next(ErrorFactory.validationAppError('Debes deshabilitar las modificaciones antes de procesar la jornada'))
      }

      // 2. Verificar que la jornada exista
      const jornada = await em.findOne(Jornada, jornadaId)
      if (!jornada) {
        return next(ErrorFactory.notFound('Jornada no encontrada'))
      }

      // 3. Crear snapshots de todos los equipos
      const snapshotService = new EquipoSnapshotService(em)
      const snapshotsCreados = await snapshotService.crearSnapshotsJornada(jornadaId)

      // 4. Obtener datos de la API externa
      await EstadisticaJugadorService.actualizarEstadisticasJornada(em, jornadaId)

      // 5. Calcular puntajes para todos los equipos
      console.log('\nPASO 3: Calculando puntajes de equipos...')
      let puntajesCalculados = false
      if (snapshotsCreados > 0) {
        await snapshotService.calcularPuntajesJornada(jornadaId)
        puntajesCalculados = true
        console.log('Puntajes calculados exitosamente')
      } else {
        console.log('No hay equipos para calcular puntajes, omitiendo...')
      }

      // 6. Actualizar precios de jugadores según rendimiento
      const resultadoPrecios = await HistorialPrecioService.actualizarPreciosPorRendimiento(em, jornadaId)

      //6.5 Generar recompensas de la jornada
      await generarRecompensasFinJornada(em, jornadaId);

      // 7. Activar jornada siguiente (si se solicitó)
      if (activarJornada) {
        console.log('\nPASO 4: Activando jornada...')
        // Buscar la jornada siguiente
        const jornadaSiguiente = await em.findOne(Jornada, { id: jornadaId + 1 }) 
        //Si no existe jornada siguiente, entendemos que es la última jornada
        if (!jornadaSiguiente) {
          console.log('No existe una jornada siguiente. No se activó ninguna jornada.')
          await em.flush()
          
          return res.json({
            success: true,
            message: `Jornada ${jornada.nombre} procesada exitosamente. No hay jornada siguiente para activar.`,
            data: {
              jornadaNombre: jornada.nombre,
              snapshotsCreados: true,
              puntajesCalculados: true,
              jornadaActivada: false,
              advertencia: 'No existe jornada siguiente'
            },
          })
        }

        config.jornada_activa = jornadaSiguiente
        config.updated_at = new Date()
        await em.flush()
        console.log(`✓ Jornada "${jornadaSiguiente.nombre}" establecida como activa`)
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