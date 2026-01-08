import { EntityManager } from '@mikro-orm/core'
import { Equipo } from './equipo.entity.js'
import { EquipoJornada } from './equipoJornada.entity.js'
import { EquipoJornadaJugador } from './equipoJornadaJugador.entity.js'
import { Jornada } from '../Fixture/Jornada.entity.js'
import { EstadisticaJugador } from '../EstadisticaJugador/estadistica-jugador.entity.js'
import { EstadoTorneo } from '../Torneo/torneo.entity.js'

export class EquipoSnapshotService {
  constructor(private em: EntityManager) {}

  /**
   * Crear snapshots de todos los equipos activos para una jornada
   * Guarda todos los jugadores (15) con su estado de titularidad
   */
  async crearSnapshotsJornada(jornadaId: number): Promise<number> {
    const jornada = await this.em.findOneOrFail(Jornada, jornadaId)
    
    // Buscar equipos de torneos activos
    const equipos = await this.em.find(
      Equipo, 
      { torneo_usuario: { torneo: { estado: EstadoTorneo.ACTIVO } } }, 
      { populate: ['jugadores.jugador'] }
    )
    
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

      // Crear snapshot del equipo
      const snapshot = this.em.create(EquipoJornada, {
        equipo,
        jornada,
        fecha_snapshot: new Date(),
        puntaje_total: 0,
      })

      this.em.persist(snapshot)

      // Crear registros de jugadores con estado de titularidad
      for (const equipoJugador of equipo.jugadores.getItems()) {
        const jugador = equipoJugador.jugador as any
        
        const equipoJornadaJugador = this.em.create(EquipoJornadaJugador, {
          equipo_jornada: snapshot,
          jugador: jugador,
          es_titular: equipoJugador.es_titular,
        })
        
        this.em.persist(equipoJornadaJugador)
      }

      snapshotsCreados++
    }

    await this.em.flush()
    console.log(`Snapshots creados para ${snapshotsCreados} equipos en jornada ${jornada.nombre}`)
    return snapshotsCreados
  }

  /**
   * Calcular puntajes de equipos después de obtener estadísticas
   * Solo suma puntajes de jugadores TITULARES
   */
  async calcularPuntajesJornada(jornadaId: number): Promise<void> {
    const equiposJornada = await this.em.find(
      EquipoJornada,
      { jornada: jornadaId },
      { populate: ['jugadores.jugador'] }
    )

    if (equiposJornada.length === 0) {
      console.log('No hay equipos para calcular puntajes en esta jornada')
      return
    }

    for (const equipoJornada of equiposJornada) {
      let puntajeTotal = 0
      
      // Obtener solo jugadores titulares del snapshot
      const jugadoresTitulares = equipoJornada.jugadores
        .getItems()
        .filter(ejj => ejj.es_titular)
      
      for (const equipoJugadorJornada of jugadoresTitulares) {
        const jugador = equipoJugadorJornada.jugador
        
        // Buscar estadísticas del jugador en esta jornada
        const estadisticas = await this.em.find(EstadisticaJugador, {
          jugador: jugador.id,
          partido: { jornada: jornadaId },
        })

        // Sumar puntajes de todos los partidos que jugó en la jornada
        const puntajeJugador = estadisticas.reduce((sum, stat) => sum + stat.puntaje_total, 0)
        puntajeTotal += puntajeJugador
      }

      equipoJornada.puntaje_total = puntajeTotal
    }

    await this.em.flush()
    console.log(`Puntajes calculados para ${equiposJornada.length} equipos`)
  }

  /**
   * Obtener detalle completo de un equipo en una jornada específica
   * Incluye jugadores titulares y suplentes con sus estadísticas
   */
  async obtenerEquipoEnJornada(equipoId: number, jornadaId: number) {
    const equipoJornada = await this.em.findOne(
      EquipoJornada,
      { equipo: equipoId, jornada: jornadaId },
      { 
        populate: [
          'equipo',
          'equipo.torneo_usuario',
          'equipo.torneo_usuario.usuario',        
          'jornada', 
          'jugadores.jugador',
          'jugadores.jugador.club', 
          'jugadores.jugador.posicion'
        ] 
      }
    )

    if (!equipoJornada) {
      return null
    }

    // Obtener jugadores con sus estadísticas
    const jugadoresConEstadisticas = await Promise.all(
      equipoJornada.jugadores.getItems().map(async (ejj) => {
        const jugador = ejj.jugador
        
        // Buscar estadísticas del jugador en esta jornada
        const estadisticas = await this.em.find(EstadisticaJugador, {
          jugador: jugador.id,
          partido: { jornada: jornadaId },
        })

        const stats = estadisticas[0] 
        const puntajeTotal = estadisticas.reduce((sum, stat) => sum + stat.puntaje_total, 0)

        return {
          id: jugador.id,
          nombre: jugador.nombre,
          nombreCompleto: `${jugador.primer_nombre} ${jugador.apellido}`,
          posicion: jugador.posicion?.descripcion || 'Sin posición',
          club: jugador.club.nombre,
          clubLogo: jugador.club.logo,
          foto: jugador.foto,
          esTitular: ejj.es_titular, 
          puntaje: puntajeTotal,
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

    // Ordenar: primero titulares, luego por posición
    const ordenPosiciones: Record<string, number> = {
      'Goalkeeper': 1,
      'Defender': 2,
      'Midfielder': 3,
      'Attacker': 4
    }

    jugadoresConEstadisticas.sort((a, b) => {
      // Primero ordenar por titularidad
      if (a.esTitular !== b.esTitular) {
        return a.esTitular ? -1 : 1
      }
      // Luego por posición
      return ordenPosiciones[a.posicion] - ordenPosiciones[b.posicion]
    })

    return {
      equipo: {
        id: equipoJornada.equipo.id,
        nombre: equipoJornada.equipo.nombre,
        usuarioId: equipoJornada.equipo.torneo_usuario.usuario.id, 
      },
      jornada: {
        id: equipoJornada.jornada.id,
        nombre: equipoJornada.jornada.nombre,
        temporada: equipoJornada.jornada.temporada,
        fecha_inicio: equipoJornada.jornada.fecha_inicio,
        fecha_fin: equipoJornada.jornada.fecha_fin,
      },
      puntajeTotal: equipoJornada.puntaje_total,
      fechaSnapshot: equipoJornada.fecha_snapshot,
      jugadores: jugadoresConEstadisticas,
      titulares: jugadoresConEstadisticas.filter(j => j.esTitular),
      suplentes: jugadoresConEstadisticas.filter(j => !j.esTitular),
    }
  }

  /**
   * Obtener historial completo de un equipo en todas las jornadas
   */
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

  /**
   * Obtener ranking de equipos en una jornada específica de un torneo
   */
  async obtenerRankingJornadaPorTorneo(torneoId: number, jornadaId: number) {
    return await this.em.find(
      EquipoJornada,
      { 
        jornada: jornadaId,
        equipo: { torneo_usuario: { torneo: torneoId } }
      },
      { 
        populate: ['equipo', 'equipo.torneo_usuario.usuario', 'jornada'],
        orderBy: { puntaje_total: 'DESC' }
      }
    )
  }
}