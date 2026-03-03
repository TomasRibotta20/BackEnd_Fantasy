import { schedule, ScheduledTask } from 'node-cron'
import { orm } from '../shared/db/orm.js'
import { GameConfig, AutomationState } from '../Config/gameConfig.entity.js'
import { EquipoJornada } from '../Equipo/equipoJornada.entity.js'
import { Torneo, EstadoTorneo } from '../Torneo/torneo.entity.js'
import { MercadoDiario, EstadoMercado } from '../Mercado/mercadoDiario.entity.js'
import { JornadaProcessingService } from './jornadaProcessing.service.js'
import { abrirMercado, cerrarMercado } from '../Mercado/mercado.service.js'

class AutomationService {
  private task: ScheduledTask | null = null
  private isRunning = false

  start(intervaloMinutos: number) {
    this.stop()

    const cronExpression = `*/${intervaloMinutos} * * * *`
    console.log(`[Automation] Cron iniciado con intervalo de ${intervaloMinutos} minutos (${cronExpression})`)

    this.task = schedule(cronExpression, () => {
      this.tick()
    })
  }

  stop() {
    if (this.task) {
      this.task.stop()
      this.task = null
      console.log('[Automation] Cron detenido')
    }
  }

  isActive(): boolean {
    return this.task !== null
  }

  /**
   * Mapea una fecha histórica (2021) al presente usando el offset de referencia.
   * offset = fecha_referencia_real - fecha_referencia_historica
   * fecha_mapeada = fecha_historica + offset
   */
  private calcularFechaMapeada(fechaHistorica: Date, config: GameConfig): Date {
    if (!config.fecha_referencia_real || !config.fecha_referencia_historica) {
      return fechaHistorica
    }
    const offsetMs = config.fecha_referencia_real.getTime() - config.fecha_referencia_historica.getTime()
    return new Date(fechaHistorica.getTime() + offsetMs)
  }

  private async tick() {
    if (this.isRunning) {
      console.log('[Automation] Tick omitido - procesamiento anterior aún en curso')
      return
    }

    this.isRunning = true
    console.log(`[Automation] Tick ejecutándose - ${new Date().toISOString()}`)

    try {
      const em = orm.em.fork()
      const config = await em.findOne(GameConfig, 1, { populate: ['jornada_activa'] })

      if (!config || !config.modo_automatico) {
        console.log('[Automation] Modo automático desactivado, deteniendo cron')
        this.stop()
        return
      }

      await this.procesarCicloJornada(em, config)
      await this.manejarMercados(em, config)
    } catch (error: any) {
      console.error('[Automation] Error en tick:', error.message)
    } finally {
      this.isRunning = false
    }
  }

  private async procesarCicloJornada(em: any, config: GameConfig) {
    if (!config.jornada_activa) {
      console.log('[Automation] No hay jornada activa configurada, omitiendo ciclo de jornada')
      return
    }

    const jornada = config.jornada_activa
    const ahora = new Date()

    if (config.automation_state === AutomationState.PREP) {
      // Estamos dentro de la jornada, esperando que llegue fecha_fin para procesar
      if (!jornada.fecha_fin) {
        console.log(`[Automation] Jornada ${jornada.nombre} no tiene fecha_fin, no se puede determinar cuándo procesar`)
        return
      }

      const fechaFinMapeada = this.calcularFechaMapeada(jornada.fecha_fin, config)
      console.log(`[Automation] PREP - Esperando fecha_fin mapeada: ${fechaFinMapeada.toISOString()} (ahora: ${ahora.toISOString()})`)

      if (ahora >= fechaFinMapeada) {
        // La jornada terminó, procesar
        await this.ejecutarProcesamientoJornada(em, config)
      }
      return
    }

    // Estado IDLE: verificar si la jornada activa ya empezó
    if (!jornada.fecha_inicio) {
      console.log(`[Automation] Jornada ${jornada.nombre} no tiene fecha_inicio, omitiendo`)
      return
    }

    const fechaInicioMapeada = this.calcularFechaMapeada(jornada.fecha_inicio, config)

    // Verificar si la jornada ya fue procesada (tiene snapshots)
    const jornadaId = jornada.id!
    const snapshotsExistentes = await em.count(EquipoJornada, { jornada: jornadaId })

    if (snapshotsExistentes > 0) {
      console.log(`[Automation] Jornada ${jornadaId} ya tiene snapshots, ya fue procesada`)
      return
    }

    console.log(`[Automation] IDLE - Esperando fecha_inicio mapeada: ${fechaInicioMapeada.toISOString()} (ahora: ${ahora.toISOString()})`)

    if (ahora >= fechaInicioMapeada) {
      // La jornada empezó, deshabilitar modificaciones
      console.log(`[Automation] Jornada ${jornada.nombre} inició - deshabilitando modificaciones`)
      config.modificaciones_habilitadas = false
      config.automation_state = AutomationState.PREP
      config.ultima_modificacion = new Date()
      await em.persistAndFlush(config)
    }
  }

  private async ejecutarProcesamientoJornada(em: any, config: GameConfig) {
    if (!config.jornada_activa) {
      console.log('[Automation] PREP pero sin jornada activa, volviendo a IDLE')
      config.automation_state = AutomationState.IDLE
      config.modificaciones_habilitadas = true
      await em.persistAndFlush(config)
      return
    }

    const jornadaId = config.jornada_activa.id!
    console.log(`[Automation] Procesando jornada ${jornadaId}...`)

    try {
      await orm.em.transactional(async (txEm) => {
        const txConfig = await txEm.findOne(GameConfig, 1, { populate: ['jornada_activa'] })
        if (!txConfig) throw new Error('Config no encontrada en transacción')

        await JornadaProcessingService.procesarJornada(txEm, jornadaId, { activarSiguiente: true })

        // Volver a IDLE y re-habilitar modificaciones
        txConfig.automation_state = AutomationState.IDLE
        txConfig.modificaciones_habilitadas = true
        txConfig.ultimo_procesamiento_auto = new Date()
        txConfig.ultima_modificacion = new Date()
      })

      console.log('[Automation] Jornada procesada exitosamente, volviendo a IDLE')
    } catch (error: any) {
      console.error('[Automation] Error procesando jornada:', error.message)

      // Recuperación: volver a IDLE y re-habilitar modificaciones
      const freshEm = orm.em.fork()
      const freshConfig = await freshEm.findOne(GameConfig, 1)
      if (freshConfig) {
        freshConfig.automation_state = AutomationState.IDLE
        freshConfig.modificaciones_habilitadas = true
        freshConfig.ultima_modificacion = new Date()
        await freshEm.persistAndFlush(freshConfig)
      }
      console.log('[Automation] Recuperación: estado reseteado a IDLE')
    }
  }

  private async manejarMercados(em: any, config: GameConfig) {
    try {
      const torneosActivos = await em.find(Torneo, { estado: EstadoTorneo.ACTIVO })

      for (const torneo of torneosActivos) {
        const torneoId = torneo.id!

        const mercadoAbierto = await em.findOne(MercadoDiario, {
          torneo: torneoId,
          estado: EstadoMercado.ABIERTO,
        })

        if (!mercadoAbierto) {
          // No hay mercado abierto (safety net, no debería pasar normalmente)
          try {
            console.log(`[Automation] Sin mercado abierto para torneo ${torneo.nombre}, abriendo uno`)
            await abrirMercado(torneoId)
          } catch (error: any) {
            console.log(`[Automation] No se pudo abrir mercado para torneo ${torneo.nombre}: ${error.message}`)
          }
          continue
        }

        // Verificar si el mercado expiró
        const horasAbierto = (new Date().getTime() - mercadoAbierto.fecha_apertura.getTime()) / (1000 * 60 * 60)

        if (horasAbierto >= config.mercado_duracion_horas) {
          console.log(`[Automation] Cerrando mercado #${mercadoAbierto.numero_mercado} del torneo ${torneo.nombre} (${horasAbierto.toFixed(1)}h abierto)`)
          try {
            await cerrarMercado(mercadoAbierto.id!)
            // cerrarMercado (service) no abre el siguiente, lo hacemos acá
            await abrirMercado(torneoId)
          } catch (error: any) {
            console.log(`[Automation] Error cerrando/abriendo mercado: ${error.message}`)
          }
        }
      }
    } catch (error: any) {
      console.error('[Automation] Error manejando mercados:', error.message)
    }
  }
}

export const automationService = new AutomationService()
