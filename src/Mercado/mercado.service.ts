import { EntityManager } from '@mikro-orm/core';
import { orm } from '../shared/db/orm.js';
import { JugadorTorneo } from './jugadorTorneo.entity.js';
import { MercadoDiario, EstadoMercado } from './mercadoDiario.entity.js';
import { ItemMercado } from './itemMercado.entity.js';
import { MercadoPuja, EstadoPuja } from './mercadoPuja.entity.js';
import { Player } from '../Player/player.entity.js';
import { Torneo } from '../Torneo/torneo.entity.js';
import { Equipo } from '../Equipo/equipo.entity.js';
import { EquipoJugador } from '../Equipo/equipoJugador.entity.js';
import { Transaccion, TipoTransaccion } from '../Equipo/transaccion.entity.js';
import { ErrorFactory } from '../shared/errors/errors.factory.js';

const MAXIMO_JUGADORES_EQUIPO = 15;
const JUGADORES_POR_MERCADO = 10;

/**
 * Inicializa los registros JugadorTorneo para un torneo
 * Y actualiza las relaciones para jugadores que ya tienen equipo
 * se ejecuta cuando creamos un torneo
 */
export async function inicializarJugadoresTorneo(torneoId: number, em?: EntityManager) {
  const entityManager = em || orm.em.fork();
  
  const torneo = await entityManager.findOne(Torneo, torneoId);
  if (!torneo) {
    throw ErrorFactory.notFound(`Torneo con ID ${torneoId} no encontrado`);
  }

  const todosLosJugadores = await entityManager.find(Player, {});
  
  console.log(`Inicializando ${todosLosJugadores.length} jugadores para el torneo ${torneo.nombre}...`);

  for (const jugador of todosLosJugadores) {
    const jugadorTorneo = entityManager.create(JugadorTorneo, {
      jugador,
      torneo,
      aparecio_en_mercado: false,
      equipo_jugador: null
    });
    
    entityManager.persist(jugadorTorneo);
  }
  
  if (!em) {
    await entityManager.flush();
  }

  const equiposDelTorneo = await entityManager.find(
    Equipo,
    { torneoUsuario: { torneo: torneoId } },
    { populate: ['jugadores'] }
  );

  let jugadoresAsignados = 0;

  for (const equipo of equiposDelTorneo) {
    for (const equipoJugador of equipo.jugadores.getItems()) {
      const jugadorId = typeof equipoJugador.jugador === 'number' 
        ? equipoJugador.jugador 
        : (equipoJugador.jugador as any).id;

      const jugadorTorneo = await entityManager.findOne(JugadorTorneo, {
        jugador: jugadorId,
        torneo: torneoId
      });

      if (jugadorTorneo) {
        jugadorTorneo.equipo_jugador = equipoJugador;
        jugadoresAsignados++;
      }
    }
  }

  if (!em) {
    await entityManager.flush();
  }

  console.log(`Inicialización completada para torneo ${torneo.nombre}`);
  console.log(`   - Jugadores totales: ${todosLosJugadores.length}`);
  console.log(`   - Jugadores asignados a equipos: ${jugadoresAsignados}`);
  
  return { 
    jugadores_inicializados: todosLosJugadores.length,
    jugadores_asignados: jugadoresAsignados 
  };
}

/**
 * Obtiene jugadores libres de un torneo
 */
async function obtenerJugadoresLibresTorneo(torneoId: number, em: EntityManager): Promise<JugadorTorneo[]> {
  return await em.find(
    JugadorTorneo,
    {
      torneo: torneoId,
      equipo_jugador: null
    },
    { populate: ['jugador', 'jugador.position', 'jugador.club'] }
  );
}

/**
 * Función auxiliar para Mezclar un array
 */
function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Abre un nuevo mercado para un torneo
 * Selecciona 10 jugadores aleatorios disponibles
 */
export async function abrirMercado(torneoId: number) {
  return await orm.em.transactional(async (em) => {
    // 1. Validar que no haya mercado abierto
    const mercadoAbierto = await em.findOne(MercadoDiario, {
      torneo: torneoId,
      estado: EstadoMercado.ABIERTO
    });

    if (mercadoAbierto) {
      throw ErrorFactory.conflict('Ya existe un mercado abierto para este torneo');
    }

    const jugadoresLibres = await obtenerJugadoresLibresTorneo(torneoId, em);

    if (jugadoresLibres.length === 0) {
      throw ErrorFactory.badRequest('No hay jugadores libres en el torneo');
    }

    const disponibles = jugadoresLibres.filter(jt => !jt.aparecio_en_mercado);

    let jugadoresSeleccionados: JugadorTorneo[];
    let huboReset = false;
    let idsCompletados: Set<number> | undefined;

    if (disponibles.length < JUGADORES_POR_MERCADO) {
      console.log(`Reset del pool. Disponibles: ${disponibles.length}/${JUGADORES_POR_MERCADO}`);

      jugadoresSeleccionados = shuffle(disponibles);
      const faltantes = JUGADORES_POR_MERCADO - jugadoresSeleccionados.length;

      for (const jt of jugadoresLibres) {
        jt.aparecio_en_mercado = false;
      }
      huboReset = true;
      const idsSeleccionados = new Set(jugadoresSeleccionados.map(jt => jt.jugador.id));
      const recienReseteados = jugadoresLibres.filter(jt => !idsSeleccionados.has(jt.jugador.id));

      if (recienReseteados.length < faltantes) {
        throw ErrorFactory.badRequest(
          `Insuficientes jugadores libres en el torneo: ${jugadoresLibres.length} disponibles, se necesitan ${JUGADORES_POR_MERCADO}`
        );
      }

      const completar = shuffle(recienReseteados).slice(0, faltantes);
      idsCompletados = new Set(completar.map(jt => jt.jugador.id).filter((id): id is number => id !== undefined));
      jugadoresSeleccionados.push(...completar);
    } else {
      jugadoresSeleccionados = shuffle(disponibles).slice(0, JUGADORES_POR_MERCADO);
    }
    const ultimoMercado = await em.findOne(
      MercadoDiario,
      { torneo: torneoId },
      { orderBy: { numero_mercado: 'DESC' } }
    );

    const numeroMercado = ultimoMercado ? ultimoMercado.numero_mercado + 1 : 1;

    const torneo = await em.getReference(Torneo, torneoId);
    const mercado = em.create(MercadoDiario, {
      torneo,
      numero_mercado: numeroMercado,
      fecha_apertura: new Date(),
      estado: EstadoMercado.ABIERTO,
      hubo_reset_pool: huboReset
    });

    em.persist(mercado);

    for (const jugadorTorneo of jugadoresSeleccionados) {
      const item = em.create(ItemMercado, {
        mercado,
        jugador: jugadorTorneo.jugador,
        cantidad_pujas: 0
      });
      em.persist(item);

      if (huboReset && idsCompletados && jugadorTorneo.jugador.id && idsCompletados.has(jugadorTorneo.jugador.id)) {
      jugadorTorneo.aparecio_en_mercado = true;
      } else if (!huboReset) {
      jugadorTorneo.aparecio_en_mercado = true;
      }
    }

    await em.flush();

    console.log(`Mercado #${numeroMercado} abierto con ${jugadoresSeleccionados.length} jugadores`);

    return {
      mercado: {
        id: mercado.id,
        numero_mercado: mercado.numero_mercado,
        fecha_apertura: mercado.fecha_apertura,
        estado: mercado.estado,
        hubo_reset_pool: mercado.hubo_reset_pool
      },
      jugadores: jugadoresSeleccionados.map(jt => ({
        id: jt.jugador.id,
        nombre: jt.jugador.name,
        posicion: jt.jugador.position?.description,
        club: jt.jugador.club.nombre,
        precio_actual: jt.jugador.precio_actual
      }))
    };
  });
}

/**
 * Valida si un equipo puede comprar un jugador
 * Verifica límite total y límite por posición
 */
export async function validarCupoParaCompra(
  equipoId: number,
  jugadorId: number,
  em: EntityManager
): Promise<{ valido: boolean; razon?: string }> {
  
  const equipo = await em.findOne(Equipo, equipoId, {
    populate: ['jugadores.jugador', 'jugadores.jugador.position']
  });
  if (!equipo) {
    return { valido: false, razon: 'Equipo no encontrado' };
  }
  const jugadorNuevo = await em.findOne(Player, jugadorId, {
    populate: ['position']
  });
  if (!jugadorNuevo) {
    return { valido: false, razon: 'Jugador no encontrado' };
  }

  const cantidadActual = equipo.jugadores.length;
  
  if (cantidadActual >= MAXIMO_JUGADORES_EQUIPO) {
    return {
      valido: false,
      razon: `Límite de ${MAXIMO_JUGADORES_EQUIPO} jugadores alcanzado (tienes ${cantidadActual})`
    };
  }
  return { valido: true };
}

/**
 * Cierra un mercado y resuelve todas las pujas
 */
export async function cerrarMercado(mercadoId: number) {
  return await orm.em.transactional(async (em) => {
    const mercado = await em.findOne(
      MercadoDiario,
      mercadoId,
      {
        populate: [
          'items.jugador',
          'items.jugador.position',
          'items.pujas.equipo',
          'torneo'
        ]
      }
    );

    if (!mercado) {
      throw ErrorFactory.notFound('Mercado no encontrado');
    }
    if (mercado.estado !== EstadoMercado.ABIERTO) {
      throw ErrorFactory.badRequest('El mercado ya está cerrado o cancelado');
    }
    const estadisticas = {
      vendidos: 0,
      sinVenta: 0,
      rechazadosCupo: 0,
      dineroMovido: 0
    };

    mercado.estado = EstadoMercado.CERRADO;
    mercado.fecha_cierre = new Date();

    for (const item of mercado.items.getItems()) {
      const pujas = item.pujas
        .getItems()
        .filter(p => p.estado === EstadoPuja.PENDIENTE)
        .sort((a, b) => {
          if (b.monto !== a.monto) return b.monto - a.monto;
          return a.fecha_oferta.getTime() - b.fecha_oferta.getTime();
        });

      if (pujas.length === 0) {
        estadisticas.sinVenta++;
        continue;
      }

      let ganador: MercadoPuja | null = null;

      for (const puja of pujas) {
        const validacion = await validarCupoParaCompra(puja.equipo.id!, item.jugador.id!, em);

        if (validacion.valido) {
          ganador = puja;
          break;
        } else {
          if (puja.equipo.id) {
            const equipo = await em.findOne(Equipo, { id: puja.equipo.id });
            if (equipo) {
              equipo.presupuesto_bloqueado -= puja.monto;
            }
          }
          puja.estado = EstadoPuja.RECHAZADA_CUPO;
          puja.observaciones = validacion.razon;
          estadisticas.rechazadosCupo++;
        }
      }

      if (ganador) {
        if (!ganador.equipo.id) {
          continue;
        }

        const equipo = await em.findOne(Equipo, { id: ganador.equipo.id }, {
          populate: ['torneoUsuario', 'torneoUsuario.torneo']
        });

        if (!equipo) continue;

        const equipoJugador = em.create(EquipoJugador, {
          equipo,
          jugador: item.jugador,
          es_titular: false,
          fecha_incorporacion: new Date(),
          valor_clausula: 0
        });
        em.persist(equipoJugador);

        const jugadorTorneo = await em.findOne(JugadorTorneo, {
          jugador: item.jugador.id,
          torneo: mercado.torneo.id
        });

        if (jugadorTorneo) {
          jugadorTorneo.equipo_jugador = equipoJugador;
        }

        equipo.presupuesto -= ganador.monto;
        equipo.presupuesto_bloqueado -= ganador.monto;

        const transaccion = em.create(Transaccion, {
          equipo,
          tipo: TipoTransaccion.COMPRA_MERCADO,
          monto: -ganador.monto,
          jugador: item.jugador,
          fecha: new Date(),
          descripcion: `Compra en mercado #${mercado.numero_mercado}: ${item.jugador.name}`
        });
        em.persist(transaccion);

        item.puja_ganadora = ganador;
        ganador.estado = EstadoPuja.GANADA;

        for (const otraPuja of pujas) {
          if (otraPuja.id !== ganador.id && otraPuja.estado === EstadoPuja.PENDIENTE) {
            if (otraPuja.equipo.id) {
              const otroEquipo = await em.findOne(Equipo, { id: otraPuja.equipo.id });
              if (otroEquipo) {
                otroEquipo.presupuesto_bloqueado -= otraPuja.monto;
              }
            }
            otraPuja.estado = EstadoPuja.PERDIDA;
          }
        }

        estadisticas.vendidos++;
        estadisticas.dineroMovido += ganador.monto;
      } else {
        estadisticas.sinVenta++;
      }
    }

    await em.flush();

    console.log(`Mercado #${mercado.numero_mercado} cerrado`);
    console.log(`   - Vendidos: ${estadisticas.vendidos}`);
    console.log(`   - Sin venta: ${estadisticas.sinVenta}`);
    console.log(`   - Rechazados por cupo: ${estadisticas.rechazadosCupo}`);
    console.log(`   - Dinero movido: $${estadisticas.dineroMovido.toLocaleString()}`);

    return {
      mercado: {
        id: mercado.id,
        numero_mercado: mercado.numero_mercado,
        estado: mercado.estado,
        fecha_cierre: mercado.fecha_cierre
      },
      estadisticas
    };
  });
}

/**
 * Obtiene el mercado activo de un torneo
 */
export async function obtenerMercadoActivo(torneoId: number) {
  const em = orm.em.fork();

  const mercado = await em.findOne(
    MercadoDiario,
    {
      torneo: torneoId,
      estado: EstadoMercado.ABIERTO
    },
    {
      populate: [
        'items.jugador',
        'items.jugador.position',
        'items.jugador.club',
        'items'
      ]
    }
  );

  if (!mercado) {
    return null;
  }

  const items = mercado.items.getItems().map(item => ({
    id: item.id,
    jugador: {
      id: item.jugador.id,
      nombre: item.jugador.name,
      nombreCompleto: `${item.jugador.firstname} ${item.jugador.lastname}`,
      posicion: item.jugador.position?.description,
      club: item.jugador.club.nombre,
      clubLogo: item.jugador.club.logo,
      foto: item.jugador.photo,
      precio_actual: item.jugador.precio_actual
    },
    cantidad_pujas: item.cantidad_pujas
  }));

  return {
    id: mercado.id,
    numero_mercado: mercado.numero_mercado,
    fecha_apertura: mercado.fecha_apertura,
    estado: mercado.estado,
    items
  };
}