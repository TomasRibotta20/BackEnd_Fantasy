import { EntityManager, wrap} from '@mikro-orm/core'
import { Equipo } from './equipo.entity.js'
import { EquipoJornada } from './equipoJornada.entity.js'
import { Jornada } from '../Fixture/Jornada.entity.js'
import { EstadisticaJugador } from '../EstadisticaJugador/estadistica-jugador.entity.js'
import { Player } from '../Player/player.entity.js'
import { ErrorFactory } from '../shared/errors/errors.factory.js'

export class EquipoSnapshotService {
  constructor(private em: EntityManager) {}

  // Crear snapshots de todos los equipos para una jornada
  async crearSnapshotsJornada(jornadaId: number): Promise<number> {
    const jornada = await this.em.findOneOrFail(Jornada, jornadaId)
    const equipos = await this.em.find(Equipo, {}, { populate: ['jugadores.jugador'] })
    let snapshotsCreados = 0
    for (const equipo of equipos) {
      // Verificar si ya existe snapshot
      const existe = await this.em.findOne(EquipoJornada, {
        equipo: equipo.id,
        jornada: jornada.id,
      })

      if (existe) {
        console.log(`Ya existe el snapshot para el equipo ${equipo.nombre}`)
        continue
      }

      // Obtener los jugadores del equipo (unwrap de Reference)
     const jugadores = equipo.jugadores.getItems().map(ej => ej.jugador as any) as Player[]

      // Crear snapshot
      const snapshot = this.em.create(EquipoJornada, {
        equipo,
        jornada,
        jugadores,
        fechaSnapshot: new Date(),
        puntajeTotal: 0,
      })

      this.em.persist(snapshot)
      snapshotsCreados++
    }

    await this.em.flush()
    console.log(`Snapshots creados para ${equipos.length} equipos en jornada ${jornada.nombre}`)
    return snapshotsCreados
  }

  // Calcular puntajes después de obtener estadísticas
  async calcularPuntajesJornada(jornadaId: number): Promise<void> {
    const equiposJornada = await this.em.find(
      EquipoJornada,
      { jornada: jornadaId },
      { populate: ['jugadores', 'equipo', 'equipo.jugadores'] }
    )

    if (equiposJornada.length === 0) {
      console.log('No hay equipos para calcular puntajes en esta jornada')
      return
    }

    for (const equipoJornada of equiposJornada) {
        let puntajeTotal = 0
        // Obtener mapa de titularidad
        const titularesIds = new Set<number>()
        for (const ej of equipoJornada.equipo.jugadores.getItems()) {
        if (ej.es_titular) {
            const jugadorId = typeof ej.jugador === 'number' ? ej.jugador : (ej.jugador as any).id
            titularesIds.add(jugadorId)
        }
        }
        // Para cada jugador del equipo en esa jornada
        const jugadores = equipoJornada.jugadores.getItems()
        for (const jugador of jugadores) {
            // Buscar sus estadísticas en los partidos de esa jornada
            if (!jugador.id || !titularesIds.has(jugador.id)) {
                continue
            }
            const estadisticas = await this.em.find(EstadisticaJugador, {
            jugador: jugador.id,
            partido: { jornada: jornadaId },
            })

            // Sumar puntajes
            const puntajeJugador = estadisticas.reduce((sum, stat) => sum + stat.puntaje_total, 0)
            puntajeTotal += puntajeJugador
        }

      equipoJornada.puntajeTotal = puntajeTotal
    }

    await this.em.flush()
    console.log(`Puntajes calculados para ${equiposJornada.length} equipos`)
  }

  // Obtener detalle de equipo en jornada (con estadísticas)
async obtenerEquipoEnJornada(equipoId: number, jornadaId: number) {
  const equipoJornada = await this.em.findOne(
    EquipoJornada,
    { equipo: equipoId, jornada: jornadaId },
    { 
      populate: [
        'equipo',        
        'jornada', 
        'jugadores', 
        'jugadores.club', 
        'jugadores.position'
      ] 
    }
  )

  if (!equipoJornada) {
    return null
  }

  // Obtener la info de titularidad
  const equipo = await this.em.findOne(
    Equipo,
    equipoId,
    { populate: ['jugadores.jugador'] }
  )

  const titularidadMap = new Map<number, boolean>()
  if (equipo) {
    for (const ej of equipo.jugadores.getItems()) {
      const jugadorId = typeof ej.jugador === 'number' ? ej.jugador : (ej.jugador as any).id
      titularidadMap.set(jugadorId, ej.es_titular)
    }
  }

  // Construir respuesta optimizada
  const jugadores = equipoJornada.jugadores.getItems()
  const jugadoresData = await Promise.all(
    jugadores.map(async (jugador) => {
      const estadisticas = await this.em.find(EstadisticaJugador, {
        jugador: jugador.id,
        partido: { jornada: jornadaId },
      })

      const stats = estadisticas[0]
      const puntaje = estadisticas.reduce((sum, stat) => sum + stat.puntaje_total, 0)

      return {
        id: jugador.id,
        nombre: jugador.name,
        nombreCompleto: `${jugador.firstname} ${jugador.lastname}`,
        posicion: jugador.position?.description || 'Sin posición',
        club: jugador.club.nombre,
        clubLogo: jugador.club.logo,
        foto: jugador.photo,
        esTitular: jugador.id ? (titularidadMap.get(jugador.id) || false) : false,
        puntaje,
        estadisticas: stats ? {
          minutos: stats.minutos,
          rating: stats.rating,
          goles: stats.goles,
          asistencias: stats.asistencias,
          golesRecibidos: stats.goles_concedidos,
          atajadas: stats.atajadas,
          tarjetasAmarillas: stats.tarjetas_amarillas,
          tarjetasRojas: stats.tarjetas_rojas,
          porteriaCero: stats.porterias_a_cero,
        } : null
      }
    })
  )

  // Ordenar: titulares primero, luego por posición
  const ordenPosiciones: Record<string, number> = {
    'Goalkeeper': 1,
    'Defender': 2,
    'Midfielder': 3,
    'Attacker': 4
  }

  jugadoresData.sort((a, b) => {
    if (a.esTitular !== b.esTitular) return a.esTitular ? -1 : 1
    return ordenPosiciones[a.posicion] - ordenPosiciones[b.posicion]
  })

  return {
    equipo: {
      id: equipoJornada.equipo.id,
      nombre: equipoJornada.equipo.nombre,
      usuarioId: equipoJornada.equipo.usuario, 
    },
    jornada: {
      id: equipoJornada.jornada.id,
      nombre: equipoJornada.jornada.nombre,
      temporada: equipoJornada.jornada.temporada,
      fecha_inicio: equipoJornada.jornada.fecha_inicio,
      fecha_fin: equipoJornada.jornada.fecha_fin,
    },
    puntajeTotal: equipoJornada.puntajeTotal,
    fechaSnapshot: equipoJornada.fechaSnapshot,
    jugadores: jugadoresData,
  }
}

  // Historial de un equipo
  async obtenerHistorialEquipo(equipoId: number) {
    return await this.em.find(
      EquipoJornada,
      { equipo: equipoId },
      {
        populate: ['jornada'],
        orderBy: { jornada: { fecha_inicio: 'ASC' } },
      }
    )
  }

  // Ranking de jornada
  async obtenerRankingJornada(jornadaId: number) {
    return await this.em.find(
      EquipoJornada,
      { jornada: jornadaId },
      {
        populate: ['equipo', 'equipo.usuario', 'jornada'],
        orderBy: { puntajeTotal: 'DESC' },
      }
    )
  }
}