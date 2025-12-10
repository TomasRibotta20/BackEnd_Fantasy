import { EntityManager } from '@mikro-orm/core';
import { EstadisticaJugador } from './estadistica-jugador.entity.js';
import { Partido } from '../Fixture/partido.entity.js';
import { Player } from '../Player/player.entity.js';
import { obtenerEstadisticasJugadoresPorPartido, obtenerDetallesPartido, verificarDisponibilidadEstadisticas  } from '../shared/api/apisports.js';

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export class EstadisticaJugadorService {
    /**
   * Actualiza las estadísticas de todos los jugadores para una jornada específica
   */
  static async actualizarEstadisticasJornada(em: EntityManager, jornadaId: number): Promise<number> {
    const partidos = await em.find(Partido, {
      jornada: jornadaId,
      estado: 'FT'
    });
    if (partidos.length === 0) {
      console.log(`No se encontraron partidos finalizados para la jornada ${jornadaId}`);
      return 0;
    }
    console.log(`Procesando ${partidos.length} partidos para la jornada ${jornadaId}`);
    let partidosProcesados = 0;
    const partidosSinEstadisticas = [];

    for (const partido of partidos) {
      const estadisticasExistentes = await em.count(EstadisticaJugador, { partido });
      if (estadisticasExistentes > 0) {
        console.log(`El partido ${partido.id} ya tiene ${estadisticasExistentes} registros. Omitiendo...`);
        partidosProcesados++;
        continue;
      }
      try {
        if (!partido.id_api) {
          console.error(`El partido ${partido.id} no tiene ID de API configurado`);
          continue;
        }
        console.log(`Obteniendo estadísticas para el partido ${partido.id} (API ID: ${partido.id_api})`);
        const hayEstadisticas = await verificarDisponibilidadEstadisticas(partido.id_api);
        if (!hayEstadisticas) {
          console.log(`No hay estadísticas disponibles para el partido ${partido.id_api}. Marcando como procesado sin datos.`);
          partidosSinEstadisticas.push(partido.id_api);
          partidosProcesados++;
          continue;
        }
        const datosEstadisticas = await obtenerEstadisticasJugadoresPorPartido(partido.id_api);
        if (datosEstadisticas.length === 0) {
          console.log(`No se encontraron estadísticas de jugadores para el partido ${partido.id_api}`);
          partidosSinEstadisticas.push(partido.id_api);
          partidosProcesados++;
          continue;
        }
        console.log(`Se obtuvieron estadísticas de ${datosEstadisticas.length} jugadores para el partido ${partido.id}`);
        
        let equipoLocal = 0;
        let equipoVisitante = 0;
        let golesLocal = 0;
        let golesVisitante = 0;
        try {
          const detallesPartido = await obtenerDetallesPartido(partido.id_api);
          golesLocal = detallesPartido.goals.home || 0;
          golesVisitante = detallesPartido.goals.away || 0;
          equipoLocal = detallesPartido.teams.home.id;
          equipoVisitante = detallesPartido.teams.away.id;
        } catch (error) {
          console.warn(`No se pudieron obtener detalles del partido ${partido.id_api}, usando datos limitados`);
        }
        const estadisticas = [];
        
        for (const datos of datosEstadisticas) {
          const jugador = await em.findOne(Player, { apiId: datos.player_id });
          if (!jugador) {
            console.log(`No se encontró el jugador con ID API ${datos.player_id}`);
            continue;
          }
          const estadistica = new EstadisticaJugador();
          estadistica.jugador = jugador;
          estadistica.partido = partido;
          estadistica.minutos = datos.minutos || 0;
          estadistica.posicion = datos.posicion;
          estadistica.rating = datos.rating;
          estadistica.capitan = datos.capitan || false;
          estadistica.goles = datos.goles || 0;
          estadistica.asistencias = datos.asistencias || 0;
          estadistica.goles_concedidos = datos.goles_concedidos || 0;
          estadistica.atajadas = datos.atajadas || 0;
          estadistica.tarjetas_amarillas = datos.tarjetas_amarillas || 0;
          estadistica.tarjetas_rojas = datos.tarjetas_rojas || 0;
          
          let porteriaACero = false;
          const esPorteroODefensa = ['G', 'D'].includes(datos.posicion);
          
          if (esPorteroODefensa && datos.minutos >= 60) {
            if (equipoLocal && equipoVisitante) {
              const esLocal = partido.local?.id_api === equipoLocal;
              porteriaACero = esLocal ? golesVisitante === 0 : golesLocal === 0;
            } else {
              porteriaACero = datos.posicion === 'G' ? datos.goles_concedidos === 0 : false;
            }
          }
          estadistica.porterias_a_cero = porteriaACero;
          estadistica.puntaje_total = this.calcularPuntaje(estadistica);
          estadisticas.push(estadistica);
        }
      
        if (estadisticas.length > 0) {
          em.persist(estadisticas);
          await em.flush();
          console.log(`Partido ${partido.id} procesado con éxito (${++partidosProcesados}/${partidos.length})`);
        } else {
          console.log(`No se pudieron procesar estadísticas para el partido ${partido.id}`);
        }
      } catch (error) {
        console.error(`Error procesando estadísticas para partido ${partido.id}:`, error);
      }
    }
    
    if (partidosSinEstadisticas.length > 0) {
      console.log(`ADVERTENCIA: ${partidosSinEstadisticas.length} partidos no tienen estadísticas disponibles: ${partidosSinEstadisticas.join(', ')}`);
    }
    return partidosProcesados;
  }

  static calcularPuntaje(estadistica: EstadisticaJugador): number {
    let puntaje = 0;
    
    if ((estadistica.minutos ?? 0) >= 60) {
      puntaje += 1;
    }
    
    if (estadistica.posicion === 'G') {
      puntaje += (estadistica.goles || 0) * 6;
    } else if (estadistica.posicion === 'D') {
      puntaje += (estadistica.goles || 0) * 6;
    } else if (estadistica.posicion === 'M') {
      puntaje += (estadistica.goles || 0) * 5;
    } else if (estadistica.posicion === 'F') {
      puntaje += (estadistica.goles || 0) * 4;
    }
    puntaje += (estadistica.asistencias || 0) * 3;
    
    if (estadistica.porterias_a_cero) {
      if (estadistica.posicion === 'G') {
        puntaje += 4;
      } else if (estadistica.posicion === 'D') {
        puntaje += 4;
      }
    }
    puntaje -= (estadistica.tarjetas_amarillas || 0) * 2;
    puntaje -= (estadistica.tarjetas_rojas || 0) * 5;
    
    if (estadistica.rating) {
      puntaje += estadistica.rating;
    }
    return Math.max(0, puntaje);
  }

  /**
   * Obtiene los puntajes de todos los jugadores para una jornada
   */
  static async getPuntajesPorJornada(em: EntityManager, jornadaId: number): Promise<EstadisticaJugador[]> {
    const estadisticas = await em.find(EstadisticaJugador, {
      partido: { jornada: jornadaId }
    }, {
      populate: ['jugador', 'partido']
    });
    
    return estadisticas;
  }
  
  /**
   * Obtiene los puntajes de un jugador en una jornada específica
   */
  static async getPuntajeJugadorPorJornada(em: EntityManager, jugadorId: number, jornadaId: number): Promise<EstadisticaJugador | null> {
    const estadistica = await em.findOne(EstadisticaJugador, {
      jugador: jugadorId,
      partido: { jornada: jornadaId }
    }, {
      populate: ['jugador', 'partido']
    });
    return estadistica;
  }
}