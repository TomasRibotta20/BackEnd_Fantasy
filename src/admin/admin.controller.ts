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
    let config = await em.findOne(GameConfig, 1, { populate: ['jornada_activa'] })
    
    if (!config) {
      config = em.create(GameConfig, {
        modificaciones_habilitadas: true,
        cupo_maximo_torneos: 5,
        dias_proteccion_clausula: 2,
        ratio_blindaje_clausula: 2,
        max_jugadores_por_equipo: 15,
        ultima_modificacion: new Date()
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
      config.ultima_modificacion = new Date()
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
          updatedAt: config.ultima_modificacion
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
  
  try {
    // Ejecutar todo dentro de una transacción
    await orm.em.transactional(async (em) => {
      // 1. Verificar que las modificaciones estén deshabilitadas
      const config = await em.findOne(GameConfig, 1)
      if (!config || config.modificaciones_habilitadas) {
        throw ErrorFactory.validationAppError('Debes deshabilitar las modificaciones antes de procesar la jornada')
      }

      // 2. Verificar que la jornada exista
      const jornada = await em.findOne(Jornada, jornadaId)
      if (!jornada) {
        throw ErrorFactory.notFound('Jornada no encontrada')
      }

      console.log(`\n=== PROCESANDO JORNADA ${jornada.nombre} ===\n`)

      // 3. Crear snapshots de todos los equipos
      console.log('PASO 1: Creando snapshots de equipos...')
      const snapshotService = new EquipoSnapshotService(em)
      const snapshotsCreados = await snapshotService.crearSnapshotsJornada(jornadaId)
      console.log(`Snapshots creados: ${snapshotsCreados}`)

      // 4. Obtener datos de la API externa
      console.log('\nPASO 2: Obteniendo estadísticas de la API externa...')
      await EstadisticaJugadorService.actualizarEstadisticasJornada(em, jornadaId)
      console.log('Estadísticas actualizadas')

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
      console.log('\nPASO 4: Actualizando precios de jugadores...')
      const resultadoPrecios = await HistorialPrecioService.actualizarPreciosPorRendimiento(em, jornadaId)
      console.log(`Precios actualizados: ${resultadoPrecios.precios_actualizados}`)

      // 7. Generar recompensas de la jornada
      console.log('\nPASO 5: Generando recompensas...')
      await generarRecompensasFinJornada(em, jornadaId)
      console.log('Recompensas generadas')

      // 8. Activar jornada siguiente (si se solicitó)
      let jornadaActivada = false
      let mensajeActivacion = ''
      
      if (activarJornada) {
        console.log('\nPASO 6: Activando jornada siguiente...')
        const jornadaSiguiente = await em.findOne(Jornada, { id: jornadaId + 1 })
        
        if (!jornadaSiguiente) {
          console.log('No existe una jornada siguiente')
          mensajeActivacion = 'No existe jornada siguiente'
        } else {
          config.jornada_activa = jornadaSiguiente
          config.ultima_modificacion = new Date()
          jornadaActivada = true
          mensajeActivacion = `Jornada "${jornadaSiguiente.nombre}" activada`
          console.log(` ${mensajeActivacion}`)
        }
      }

      console.log('\n=== JORNADA PROCESADA EXITOSAMENTE ===\n')

      // Si llegamos aquí, todo fue exitoso y la transacción se commitea automáticamente
      return {
        jornada,
        snapshotsCreados,
        puntajesCalculados,
        resultadoPrecios,
        jornadaActivada,
        mensajeActivacion
      }
    })
    .then((resultado) => {
      // Respuesta exitosa fuera de la transacción
      res.json({
        success: true,
        message: `Jornada ${resultado.jornada.nombre} procesada exitosamente`,
        data: {
          jornadaNombre: resultado.jornada.nombre,
          snapshotsCreados: resultado.snapshotsCreados > 0,
          puntajesCalculados: resultado.puntajesCalculados,
          preciosActualizados: resultado.resultadoPrecios.precios_actualizados,
          jornadaActivada: resultado.jornadaActivada,
          mensaje: resultado.mensajeActivacion || undefined
        },
      })
    })
    
  } catch (error: any) {
    console.error('\nERROR AL PROCESAR JORNADA:', error.message)
    
    // Manejar errores específicos
    if (error.statusCode) {
      return next(error)
    }
    return next(ErrorFactory.internal("Error al procesar jornada"))
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