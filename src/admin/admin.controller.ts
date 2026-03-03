import { NextFunction, Request, Response } from 'express'
import { orm } from '../shared/db/orm.js'
import { GameConfig, AutomationState } from '../Config/gameConfig.entity.js'
import { Jornada } from '../Fixture/Jornada.entity.js'
import { EquipoSnapshotService } from '../Equipo/equipoSnapshot.service.js'
import { EquipoJornada } from '../Equipo/equipoJornada.entity.js'
import {ErrorFactory} from "../shared/errors/errors.factory.js";
import { HistorialPrecioService } from '../HistorialPrecio/historial-precio.service.js';
import { generarRecompensasFinJornada } from '../Recompensa/recompensa.service.js'
import { SeedService } from './admin.seed.service.js'
import { JornadaProcessingService } from '../Automation/jornadaProcessing.service.js'
import { automationService } from '../Automation/automation.service.js'
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
    const resultado = await orm.em.transactional(async (em) => {
      // Verificar que las modificaciones estén deshabilitadas
      const config = await em.findOne(GameConfig, 1)
      if (!config || config.modificaciones_habilitadas) {
        throw ErrorFactory.validationAppError('Debes deshabilitar las modificaciones antes de procesar la jornada')
      }

      return await JornadaProcessingService.procesarJornada(em, jornadaId, { activarSiguiente: activarJornada })
    })

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

  } catch (error: any) {
    console.error('\nERROR AL PROCESAR JORNADA:', error.message)

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
  async seedDatabase(req: Request, res: Response, next: NextFunction) {
    const { leagueId, season } = req.body;

    try {
      console.log(`\n=== INICIO SEED DATABASE (league: ${leagueId}, season: ${season}) ===\n`);
      const em = orm.em;
      const result = await em.transactional(async (em) => {
        const seedService = new SeedService(em);
        return seedService.execute(leagueId, season);
      });

      console.log('\n=== SEED DATABASE COMPLETADO ===\n');

      res.json({
        success: true,
        message: `Base de datos sembrada exitosamente para liga ${leagueId}, temporada ${season}`,
        data: result,
      });
    } catch (error: any) {
      console.error('\nERROR EN SEED DATABASE:', error.message);
      if (error.statusCode) {
        return next(error);
      }
      return next(ErrorFactory.internal('Error al sembrar la base de datos'));
    }
  }
  async toggleAutomation(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        modo_automatico,
        cron_intervalo_minutos,
        mercado_duracion_horas,
      } = req.body

      if (typeof modo_automatico !== 'boolean') {
        return next(ErrorFactory.badRequest('modo_automatico debe ser un booleano'))
      }

      // Validar parámetros opcionales
      if (cron_intervalo_minutos !== undefined) {
        if (cron_intervalo_minutos < 1 || cron_intervalo_minutos > 60) {
          return next(ErrorFactory.badRequest('cron_intervalo_minutos debe estar entre 1 y 60'))
        }
      }
      if (mercado_duracion_horas !== undefined) {
        if (mercado_duracion_horas < 0.5 || mercado_duracion_horas > 48) {
          return next(ErrorFactory.badRequest('mercado_duracion_horas debe estar entre 0.5 y 48'))
        }
      }

      const em = orm.em.fork()
      const config = await this.getOrCreateConfig(em)

      if (modo_automatico && !config.jornada_activa) {
        return next(ErrorFactory.badRequest('Debes configurar una jornada activa antes de activar el modo automático'))
      }

      config.modo_automatico = modo_automatico

      if (cron_intervalo_minutos !== undefined) {
        config.cron_intervalo_minutos = cron_intervalo_minutos
      }
      if (mercado_duracion_horas !== undefined) {
        config.mercado_duracion_horas = mercado_duracion_horas
      }

      if (modo_automatico) {
        // Calcular offset: la fecha_inicio de la jornada activa = ahora
        const jornada = config.jornada_activa!
        if (jornada.fecha_inicio) {
          config.fecha_referencia_real = new Date()
          config.fecha_referencia_historica = jornada.fecha_inicio
          console.log(`[Admin] Offset calculado: ${jornada.fecha_inicio.toISOString()} → ${config.fecha_referencia_real.toISOString()}`)
        }
        automationService.start(config.cron_intervalo_minutos)
        console.log(`[Admin] Modo automático ACTIVADO - intervalo: ${config.cron_intervalo_minutos} min`)
      } else {
        automationService.stop()
        // Resetear estado si estaba en PREP
        if (config.automation_state === AutomationState.PREP) {
          config.modificaciones_habilitadas = true
        }
        config.automation_state = AutomationState.IDLE
        config.fecha_referencia_real = undefined
        config.fecha_referencia_historica = undefined
        console.log('[Admin] Modo automático DESACTIVADO')
      }

      config.ultima_modificacion = new Date()
      await em.persistAndFlush(config)

      res.json({
        success: true,
        message: modo_automatico ? 'Modo automático activado' : 'Modo automático desactivado',
        data: {
          modo_automatico: config.modo_automatico,
          automation_state: config.automation_state,
          cron_intervalo_minutos: config.cron_intervalo_minutos,
          mercado_duracion_horas: config.mercado_duracion_horas,
          fecha_referencia_real: config.fecha_referencia_real,
          fecha_referencia_historica: config.fecha_referencia_historica,
          cron_activo: automationService.isActive(),
        }
      })
    } catch (error: any) {
      console.error('Error en toggleAutomation:', error.message)
      next(ErrorFactory.internal('Error al cambiar modo de automatización'))
    }
  }

  async getAutomationStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const em = orm.em.fork()
      const config = await em.findOne(GameConfig, 1, { populate: ['jornada_activa'] })

      if (!config) {
        return next(ErrorFactory.notFound('No hay configuración establecida'))
      }

      // Calcular fechas mapeadas de la jornada activa para debug
      let jornada_mapeada = null
      if (config.jornada_activa && config.fecha_referencia_real && config.fecha_referencia_historica) {
        const offsetMs = config.fecha_referencia_real.getTime() - config.fecha_referencia_historica.getTime()
        const j = config.jornada_activa
        jornada_mapeada = {
          fecha_inicio_original: j.fecha_inicio,
          fecha_fin_original: j.fecha_fin,
          fecha_inicio_mapeada: j.fecha_inicio ? new Date(j.fecha_inicio.getTime() + offsetMs) : null,
          fecha_fin_mapeada: j.fecha_fin ? new Date(j.fecha_fin.getTime() + offsetMs) : null,
        }
      }

      res.json({
        success: true,
        data: {
          modo_automatico: config.modo_automatico,
          automation_state: config.automation_state,
          cron_intervalo_minutos: config.cron_intervalo_minutos,
          mercado_duracion_horas: config.mercado_duracion_horas,
          ultimo_procesamiento_auto: config.ultimo_procesamiento_auto,
          fecha_referencia_real: config.fecha_referencia_real,
          fecha_referencia_historica: config.fecha_referencia_historica,
          modificaciones_habilitadas: config.modificaciones_habilitadas,
          cron_activo: automationService.isActive(),
          jornada_activa: config.jornada_activa ? {
            id: config.jornada_activa.id,
            nombre: config.jornada_activa.nombre,
          } : null,
          jornada_mapeada,
          hora_actual: new Date(),
        }
      })
    } catch (error: any) {
      next(ErrorFactory.internal('Error al obtener estado de automatización'))
    }
  }
}


export const adminController = new AdminController()
