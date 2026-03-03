import { EntityManager } from '@mikro-orm/mysql'
import { GameConfig } from '../Config/gameConfig.entity.js'
import { Jornada } from '../Fixture/Jornada.entity.js'
import { EquipoSnapshotService } from '../Equipo/equipoSnapshot.service.js'
import { EstadisticaJugadorService } from '../EstadisticaJugador/estadistica-jugador.service.js'
import { HistorialPrecioService } from '../HistorialPrecio/historial-precio.service.js'
import { generarRecompensasFinJornada } from '../Recompensa/recompensa.service.js'
import { ErrorFactory } from '../shared/errors/errors.factory.js'

export interface ProcessingResult {
  jornada: Jornada
  snapshotsCreados: number
  puntajesCalculados: boolean
  resultadoPrecios: { precios_actualizados: number }
  jornadaActivada: boolean
  mensajeActivacion: string
}

export class JornadaProcessingService {
  static async procesarJornada(
    em: EntityManager,
    jornadaId: number,
    options: { activarSiguiente: boolean }
  ): Promise<ProcessingResult> {
    const jornada = await em.findOne(Jornada, jornadaId)
    if (!jornada) {
      throw ErrorFactory.notFound('Jornada no encontrada')
    }

    console.log(`\n=== PROCESANDO JORNADA ${jornada.nombre} ===\n`)

    // 1. Crear snapshots de todos los equipos
    console.log('PASO 1: Creando snapshots de equipos...')
    const snapshotService = new EquipoSnapshotService(em)
    const snapshotsCreados = await snapshotService.crearSnapshotsJornada(jornadaId)
    console.log(`Snapshots creados: ${snapshotsCreados}`)

    // 2. Obtener datos de la API externa
    console.log('\nPASO 2: Obteniendo estadísticas de la API externa...')
    await EstadisticaJugadorService.actualizarEstadisticasJornada(em, jornadaId)
    console.log('Estadísticas actualizadas')

    // 3. Calcular puntajes para todos los equipos
    console.log('\nPASO 3: Calculando puntajes de equipos...')
    let puntajesCalculados = false
    if (snapshotsCreados > 0) {
      await snapshotService.calcularPuntajesJornada(jornadaId)
      puntajesCalculados = true
      console.log('Puntajes calculados exitosamente')
    } else {
      console.log('No hay equipos para calcular puntajes, omitiendo...')
    }

    // 4. Actualizar precios de jugadores según rendimiento
    console.log('\nPASO 4: Actualizando precios de jugadores...')
    const resultadoPrecios = await HistorialPrecioService.actualizarPreciosPorRendimiento(em, jornadaId)
    console.log(`Precios actualizados: ${resultadoPrecios.precios_actualizados}`)

    // 5. Generar recompensas de la jornada
    console.log('\nPASO 5: Generando recompensas...')
    await generarRecompensasFinJornada(em, jornadaId)
    console.log('Recompensas generadas')

    // 6. Activar jornada siguiente (si se solicitó)
    let jornadaActivada = false
    let mensajeActivacion = ''

    if (options.activarSiguiente) {
      console.log('\nPASO 6: Activando jornada siguiente...')
      const jornadaSiguiente = await em.findOne(Jornada, { id: jornadaId + 1 })

      if (!jornadaSiguiente) {
        console.log('No existe una jornada siguiente')
        mensajeActivacion = 'No existe jornada siguiente'
      } else {
        const config = await em.findOne(GameConfig, 1)
        if (config) {
          config.jornada_activa = jornadaSiguiente
          config.ultima_modificacion = new Date()
        }
        jornadaActivada = true
        mensajeActivacion = `Jornada "${jornadaSiguiente.nombre}" activada`
        console.log(` ${mensajeActivacion}`)
      }
    }

    console.log('\n=== JORNADA PROCESADA EXITOSAMENTE ===\n')

    return {
      jornada,
      snapshotsCreados,
      puntajesCalculados,
      resultadoPrecios,
      jornadaActivada,
      mensajeActivacion,
    }
  }
}
