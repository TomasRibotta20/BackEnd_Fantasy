import { EntityManager } from '@mikro-orm/core';
import { clubes } from '../Club/club.entity.js';
import { Player } from '../Player/player.entity.js';
import { calcularPreciosConIA, JugadorParaPrecio } from '../shared/api/groq.js';
import { findAndPaginate } from '../Player/player.service.js';
import { HistorialPrecio, MotivoActualizacionPrecio } from './historial-precio.entity.js';
import { EstadisticaJugador } from '../EstadisticaJugador/estadistica-jugador.entity.js';
import { ErrorFactory } from '../shared/errors/errors.factory.js';

interface TendenciasAnalisis {
  modificadorTotal: number;
  detalles: string[];
}
export class HistorialPrecioService {
  
  /**
   * Obtiene los precios sugeridos por IA para un club (SIN GUARDAR)
   */
  static async obtenerPreciosSugeridosPorClub(
    em: EntityManager, 
    clubId: number
  ) {

    const club = await em.findOne(clubes, { id: clubId });
    if (!club) {
      throw ErrorFactory.notFound(`Club con ID ${clubId} no encontrado`);
    }

    const resultadoJugadores = await findAndPaginate({
      club: clubId.toString(),
      limit: 1000
    });

    const jugadores = resultadoJugadores.data;

    if (jugadores.length === 0) {
      throw ErrorFactory.notFound(`No se encontraron jugadores para el club ${club.nombre}`);
    }
    const jugadoresParaIA: JugadorParaPrecio[] = jugadores
      .filter(j => j.id !== undefined)
      .map(j => ({
        id: j.id!,
        nombre: j.nombre || 'Sin nombre',
        posicion: j.posicion?.descripcion || 'Desconocida',
        edad: j.edad || undefined
      }));


    const preciosSugeridos = await calcularPreciosConIA(club.nombre || 'Club', jugadoresParaIA);

    const resultados = jugadores.map(jugador => {
      const precioIA = preciosSugeridos.find(p => p.id === jugador.id);
      
      return {
        id: jugador.id,
        nombre: jugador.nombre,
        posicion: jugador.posicion?.descripcion,
        edad: jugador.edad,
        precio_sugerido: precioIA?.precio || null,
        precio_actual: jugador.precio_actual || null
      };
    });

    const resultadosOrdenados = resultados.sort(
      (a, b) => (b.precio_sugerido || 0) - (a.precio_sugerido || 0)
    );

    const preciosValidos = resultados.filter(r => r.precio_sugerido !== null);
    const precioPromedio = preciosValidos.length > 0
      ? Math.round(preciosValidos.reduce((sum, r) => sum + (r.precio_sugerido || 0), 0) / preciosValidos.length)
      : 0;

    const precioMaximo = preciosValidos.length > 0
      ? Math.max(...preciosValidos.map(r => r.precio_sugerido || 0))
      : 0;

    const precioMinimo = preciosValidos.length > 0
      ? Math.min(...preciosValidos.map(r => r.precio_sugerido || 0))
      : 0;

    return {
      club: {
        id: club.id,
        nombre: club.nombre
      },
      estadisticas: {
        total_jugadores: jugadores.length,
        jugadores_con_precio: preciosSugeridos.length,
        precio_promedio: precioPromedio,
        precio_maximo: precioMaximo,
        precio_minimo: precioMinimo
      },
      jugadores: resultadosOrdenados
    };
  }

  /**
   * Calcula Y GUARDA los precios de un club en la base de datos
   */
  static async calcularYGuardarPreciosClub(
    em: EntityManager,
    clubId: number
  ) {
    const resultado = await this.obtenerPreciosSugeridosPorClub(em, clubId);

    let preciosActualizados = 0;
    let preciosCreados = 0;
    let errores = 0;

    console.log(`Guardando precios para ${resultado.club.nombre}...`);

    for (const jugadorData of resultado.jugadores) {
      if (!jugadorData.precio_sugerido) {
        console.warn(`Jugador ${jugadorData.nombre} sin precio sugerido, omitiendo...`);
        errores++;
        continue;
      }

      try {
        const jugador = await em.findOne(Player, { id: jugadorData.id });

        if (!jugador) {
          console.error(`Jugador con ID ${jugadorData.id} no encontrado`);
          errores++;
          continue;
        }

        const yaTeníaPrecio = jugador.precio_actual !== null && jugador.precio_actual !== undefined;

        jugador.precio_actual = jugadorData.precio_sugerido;
        jugador.ultima_actualizacion_precio = new Date();

        const historial = new HistorialPrecio();
        historial.jugador = jugador;
        historial.precio = jugadorData.precio_sugerido;
        historial.fecha = new Date();
        historial.motivo = MotivoActualizacionPrecio.INICIAL;
        historial.observaciones = `Precio calculado por IA para temporada 2021`;
        em.persist(historial);

        if (yaTeníaPrecio) {
          preciosActualizados++;
        } else {
          preciosCreados++;
        }

      } catch (error: any) {
        console.error(`Error guardando precio para jugador ${jugadorData.nombre}:`, error.message);
        errores++;
      }
    }
    await em.flush();

    return {
      club: resultado.club,
      estadisticas: resultado.estadisticas,
      resultado_guardado: {
        precios_creados: preciosCreados,
        precios_actualizados: preciosActualizados,
        errores: errores,
        total_procesado: preciosCreados + preciosActualizados
      }
    };
  }

  /**
   * Calcula y guarda precios para TODOS los clubes
   */
  static async calcularYGuardarPreciosTodosLosClubes(em: EntityManager) {
    const todosLosClubes = await em.find(clubes, {});
    const resultados = [];
    let totalExitosos = 0;
    let totalErrores = 0;

    for (const club of todosLosClubes) {
      try {
        if (!club.id) {
          throw ErrorFactory.notFound(`Club ${club.nombre} no tiene ID válido`);
        }
        
        const resultado = await this.calcularYGuardarPreciosClub(em, club.id);
        
        resultados.push({
          club: club.nombre,
          exitoso: true,
          ...resultado.resultado_guardado
        });

        totalExitosos++;
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error: any) {
        resultados.push({
          club: club.nombre,
          exitoso: false,
          error: error.message
        });

        totalErrores++;
      }
    }
    return {
      total_clubes: todosLosClubes.length,
      clubes_exitosos: totalExitosos,
      clubes_con_error: totalErrores,
      detalle: resultados
    };
  }

/**
   * Actualiza los precios de todos los jugadores basándose en su rendimiento en la jornada
   */
  static async actualizarPreciosPorRendimiento(em: EntityManager, jornadaId: number): Promise<any> {
    const estadisticas = await em.find(
      EstadisticaJugador, 
      { 
        partido: { 
          jornada: jornadaId,
          estado: 'FT'
        } 
      },
      { populate: ['jugador', 'partido', 'partido.jornada'] }
    );

    if (estadisticas.length === 0) {
      return {
        total_jugadores_procesados: 0,
        precios_actualizados: 0,
        precios_sin_cambio: 0,
        errores: 0
      };
    }

    let preciosActualizados = 0;
    let preciosSinCambio = 0;
    let errores = 0;

    for (const estadistica of estadisticas) {
      try {
        const jugador = estadistica.jugador;
        const puntaje = estadistica.puntaje_total;

        if (!jugador.precio_actual || jugador.precio_actual <= 0) {
          console.warn(`Jugador ${jugador.nombre} (ID: ${jugador.id}) no tiene precio actual valido, omitiendo...`);
          errores++;
          continue;
        }
        if (!jugador.id) {
          console.warn(`Jugador ${jugador.nombre} no tiene ID valido, omitiendo...`);
          errores++;
          continue;
        }

        const ajusteBase = this.calcularAjusteBase(puntaje);
        const tendencias = await this.analizarTendencias(em, jugador.id, jornadaId);
        const ajusteTotal = ajusteBase + tendencias.modificadorTotal;

        if (ajusteTotal === 0) {
          preciosSinCambio++;
          continue;
        }

        const precioAnterior = jugador.precio_actual;
        let precioNuevo = Math.round(precioAnterior * (1 + ajusteTotal / 100));

        precioNuevo = this.redondearPrecio(precioNuevo);
        precioNuevo = this.aplicarPrecioMinimo(precioNuevo);
        jugador.precio_actual = precioNuevo;
        jugador.ultima_actualizacion_precio = new Date();
        const historial = new HistorialPrecio();
        historial.jugador = jugador;
        historial.precio = precioNuevo;
        historial.fecha = new Date();
        historial.jornada = estadistica.partido.jornada;
        historial.motivo = MotivoActualizacionPrecio.RENDIMIENTO;
        historial.observaciones = `Puntaje: ${puntaje.toFixed(1)} pts | Ajuste base: ${ajusteBase > 0 ? '+' : ''}${ajusteBase}% | Tendencias: ${tendencias.modificadorTotal > 0 ? '+' : ''}${tendencias.modificadorTotal}% | Total: ${ajusteTotal > 0 ? '+' : ''}${ajusteTotal}% | ${tendencias.detalles.join(', ')}`;

        em.persist(historial);
        preciosActualizados++;

        console.log(`${jugador.nombre}: ${precioAnterior.toLocaleString()} -> ${precioNuevo.toLocaleString()} (${ajusteTotal > 0 ? '+' : ''}${ajusteTotal}%)`);

      } catch (error: any) {
        console.error(`Error procesando jugador:`, error.message);
        errores++;
      }
    }
    await em.flush();

    console.log(`\nActualizacion completada:`);
    console.log(`- Precios actualizados: ${preciosActualizados}`);
    console.log(`- Sin cambios: ${preciosSinCambio}`);
    console.log(`- Errores: ${errores}`);

    return {
      total_jugadores_procesados: estadisticas.length,
      precios_actualizados: preciosActualizados,
      precios_sin_cambio: preciosSinCambio,
      errores: errores
    };
  }

  /**
   * Calcula el ajuste base según el puntaje obtenido
   */
   private static calcularAjusteBase(puntaje: number): number {
    switch (true) {
      case puntaje <= 1:
        return -10;
      case puntaje <= 3:
        return -5;
      case puntaje <= 5:
        return -3;
      case puntaje <= 6:
        return 0;
      case puntaje <= 7:
        return 3;
      case puntaje <= 8:
        return 5;
      case puntaje <= 9:
        return 10;
      case puntaje <= 11:
        return 15;
      case puntaje <= 14:
        return 20;
      default:
        return 25;
    }
  }

  /**
   * Analiza las tendencias de las últimas 3 jornadas y aplica modificadores
   */
  private static async analizarTendencias(
    em: EntityManager,
    jugadorId: number,
    jornadaActualId: number
  ): Promise<TendenciasAnalisis> {
    
    const detalles: string[] = [];
    let modificadorTotal = 0;

    const ultimasEstadisticas = await em.find(
      EstadisticaJugador,
      { jugador: jugadorId },
      {
        populate: ['partido', 'partido.jornada'],
        orderBy: { partido: { jornada: { id: 'DESC' } } },
        limit: 4
      }
    );
    const estadisticasPrevias = ultimasEstadisticas
      .filter(e => e.partido.jornada.id !== jornadaActualId)
      .slice(0, 3);

    if (estadisticasPrevias.length < 3) {
      detalles.push('Sin tendencias (jornada < 4)');
      return { modificadorTotal: 0, detalles };
    }

    const puntajes = estadisticasPrevias
      .sort((a, b) => (a.partido.jornada?.id || 0) - (b.partido.jornada?.id || 0))
      .map(e => e.puntaje_total);

    const [p1, p2, p3] = puntajes;

    // A) Tendencia Ascendente
    if (p1 < p2 && p2 < p3) {
      modificadorTotal += 4;
      detalles.push('Tendencia ascendente +4%');
    }

    // B) Tendencia Descendente
    if (p1 > p2 && p2 > p3) {
      modificadorTotal -= 4;
      detalles.push('Tendencia descendente -4%');
    }

    //C) Racha de Buenas actuaciones (todas >= 12)
    if (puntajes.every(p => p >= 12)) {
      modificadorTotal += 10;
      detalles.push('Racha buenas actuaciones +10%');
    }
    // D) Consistencia Alta (todas >= 8)
    else if (puntajes.every(p => p >= 8)) {
      modificadorTotal += 6;
      detalles.push('Consistencia alta +6%');
    }

    // E) Inconsistencia Negativa
    const tieneRendimientoBajo = puntajes.some(p => p < 6);
    const diferencia = Math.max(...puntajes) - Math.min(...puntajes);
    if (tieneRendimientoBajo && diferencia >= 7) {
      modificadorTotal -= 3;
      detalles.push('Inconsistencia negativa -3%');
    }

    // F) Recuperación
    const primerosDosbajos = p1 < 5 && p2 < 5;
    const ultimoBueno = p3 >= 8;
    if (primerosDosbajos && ultimoBueno) {
      modificadorTotal += 2;
      detalles.push('Recuperacion +2%');
    }

    // G) Caída Reciente
    const primerosDosAltos = p1 >= 8 && p2 >= 8;
    const ultimoBajo = p3 < 5;
    if (primerosDosAltos && ultimoBajo) {
      modificadorTotal -= 5;
      detalles.push('Caida reciente -5%');
    }

    if (detalles.length === 0) {
      detalles.push('Sin modificadores de tendencia');
    }

    return { modificadorTotal, detalles };
  }

  /**
   * Redondea el precio según el rango
   */
  private static redondearPrecio(precio: number): number {
    if (precio < 1000000) {
      // Redondear a 50.000
      return Math.round(precio / 50000) * 50000;
    } else if (precio < 5000000) {
      // Redondear a 100.000
      return Math.round(precio / 100000) * 100000;
    } else if (precio < 10000000) {
      // Redondear a 250.000
      return Math.round(precio / 250000) * 250000;
    } else {
      // Redondear a 500.000
      return Math.round(precio / 500000) * 500000;
    }
  }

  /**
   * Aplica el precio mínimo de 500.000
   */
  private static aplicarPrecioMinimo(precio: number): number {
    const PRECIO_MINIMO = 500000;
    return Math.max(precio, PRECIO_MINIMO);
  }
}