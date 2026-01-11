import { EntityManager } from '@mikro-orm/core'
import { Equipo } from './equipo.entity.js'
import { EquipoJornada } from './equipoJornada.entity.js'
import { EquipoJornadaJugador } from './equipoJornadaJugador.entity.js'
import { Jornada } from '../Fixture/Jornada.entity.js'
import { EstadisticaJugador } from '../EstadisticaJugador/estadistica-jugador.entity.js'
import { EstadoTorneo } from '../Torneo/torneo.entity.js'
import { GameConfig } from '../Config/gameConfig.entity.js'
import { ErrorFactory } from '../shared/errors/errors.factory.js'
import { Player } from '../Player/player.entity.js'
import { TorneoUsuario } from '../Torneo/torneoUsuario.entity.js'



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
async obtenerEquipoEnJornada(equipoId: number, jornadaId: number, userId: number) {
  
    const equipoTarget = await this.em.findOne(Equipo, { id: equipoId }, {
        populate: ['torneo_usuario', 'torneo_usuario.torneo']
    });
    if (!equipoTarget) {
        throw ErrorFactory.notFound('El equipo solicitado no existe.');
    }
    const torneoId = equipoTarget.torneo_usuario.torneo.id;
    const miInscripcion = await this.em.findOne(TorneoUsuario, {
        torneo: torneoId,
        usuario: userId
    });
    if (!miInscripcion) {
        throw ErrorFactory.forbidden('No tienes permiso para ver equipos de un torneo en el que no participas.');
    }
    if (miInscripcion.expulsado) {
        throw ErrorFactory.forbidden('Estás expulsado de este torneo y no puedes ver la información.');
    }

    const config = await this.em.findOne(GameConfig, 1, { populate: ['jornada_activa'] });
    if (!config) {
        throw ErrorFactory.internal('La configuración del juego no está disponible.');
    }
    const esJornadaActiva = config?.jornada_activa?.id === jornadaId;
    if (jornadaId > config?.jornada_activa?.id!) {
        throw ErrorFactory.forbidden('No puedes ver información de jornadas futuras.');
    }
    if (esJornadaActiva) {
        await this.em.populate(equipoTarget, [
        'jugadores',
        'jugadores.jugador',
        'jugadores.jugador.posicion',
        'jugadores.jugador.club'
        ]);
        const equipoActual = equipoTarget;
        if (!equipoActual) throw ErrorFactory.notFound('Equipo no encontrado');

        if (equipoActual.torneo_usuario.expulsado) {
            return null;
        }

        const jugadoresActuales = equipoActual.jugadores.getItems().map(ej => {
            const jugador = ej.jugador as any as Player;
            return {
                id: jugador.id,
                nombre: jugador.nombre,
                nombreCompleto: `${jugador.primer_nombre} ${jugador.apellido}`,
                posicion: jugador.posicion?.descripcion || 'Sin posición',
                club: jugador.club.nombre,
                clubLogo: jugador.club.logo,
                foto: jugador.foto,
                esTitular: ej.es_titular,
                puntaje: null, 
                estadisticas: null 
            };
        });
        const ordenPosiciones: Record<string, number> = {
            'Goalkeeper': 1, 'Defender': 2, 'Midfielder': 3, 'Attacker': 4
        };
        jugadoresActuales.sort((a, b) => {
            if (a.esTitular !== b.esTitular) return a.esTitular ? -1 : 1;
            return (ordenPosiciones[a.posicion] || 99) - (ordenPosiciones[b.posicion] || 99);
        });
        return {
            equipo: {
                id: equipoActual.id,
                nombre: equipoActual.nombre,
                usuarioId: equipoActual.torneo_usuario.usuario.id,
                usuarioNombre: equipoActual.torneo_usuario.usuario.username || 'Usuario'
            },
            jornada: {
                id: config!.jornada_activa!.id,
                nombre: config!.jornada_activa!.nombre,
            },
            puntajeTotal: null,
            fechaSnapshot: new Date(),
            titulares: jugadoresActuales.filter(j => j.esTitular),
            suplentes: jugadoresActuales.filter(j => !j.esTitular),
        };
    }
    const equipoJornada = await this.em.findOne(EquipoJornada, { 
        equipo: equipoId, 
        jornada: jornadaId 
    }, { 
        populate: [
          'equipo',
          'equipo.torneo_usuario',
          'equipo.torneo_usuario.usuario',        
          'jornada', 
          'jugadores.jugador',
          'jugadores.jugador.club', 
          'jugadores.jugador.posicion'
        ] 
    });
    if (!equipoJornada) {
        return null; 
    }

    const listaIdsJugadores = equipoJornada.jugadores
        .getItems()
        .map(ejj => ejj.jugador.id)
        .filter((id): id is number => id !== undefined);

    const todasLasEstadisticas = await this.em.find(EstadisticaJugador, {
        jugador: { $in: listaIdsJugadores },
        partido: { jornada: jornadaId }
    });
    const statsMap = new Map<number, EstadisticaJugador>();
    todasLasEstadisticas.forEach(stat => {
        if (stat.jugador?.id) {
            statsMap.set(stat.jugador.id, stat);
        }
    });

    const jugadoresHistoricos = equipoJornada.jugadores.getItems().map((ejj) => {
        const jugador = ejj.jugador as any as Player;
        const stats = statsMap.get(jugador.id!); 
        
        return {
          id: jugador.id,
          nombre: jugador.nombre,
          nombreCompleto: `${jugador.primer_nombre} ${jugador.apellido}`,
          posicion: jugador.posicion?.descripcion || 'Sin posición',
          club: jugador.club.nombre,
          clubLogo: jugador.club.logo,
          foto: jugador.foto,
          esTitular: ejj.es_titular, 
          puntaje: stats ? stats.puntaje_total : 0,
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
        };
    });
    const ordenPosiciones: Record<string, number> = {
      'Goalkeeper': 1, 'Defender': 2, 'Midfielder': 3, 'Attacker': 4
    };
    jugadoresHistoricos.sort((a, b) => {
      if (a.esTitular !== b.esTitular) return a.esTitular ? -1 : 1;
      return (ordenPosiciones[a.posicion] || 99) - (ordenPosiciones[b.posicion] || 99);
    });

    return {
      equipo: {
        id: equipoJornada.equipo.id,
        nombre: equipoJornada.equipo.nombre,
        usuarioId: equipoJornada.equipo.torneo_usuario.usuario.id,
        usuarioNombre: equipoJornada.equipo.torneo_usuario.usuario.username
      },
      jornada: {
        id: equipoJornada.jornada.id,
        nombre: equipoJornada.jornada.nombre,
        fecha_inicio: equipoJornada.jornada.fecha_inicio
      },
      puntajeTotal: equipoJornada.puntaje_total,
      fechaSnapshot: equipoJornada.fecha_snapshot,
      titulares: jugadoresHistoricos.filter(j => j.esTitular),
      suplentes: jugadoresHistoricos.filter(j => !j.esTitular),
    };
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