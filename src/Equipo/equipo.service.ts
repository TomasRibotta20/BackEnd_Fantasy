import { raw, EntityManager } from '@mikro-orm/core';
import { orm } from '../shared/db/orm.js';
import { Player } from '../Player/player.entity.js';
import { Equipo } from './equipo.entity.js';
import { ErrorFactory } from '../shared/errors/errors.factory.js';
import { EquipoJugador } from './equipoJugador.entity.js';
import { TorneoUsuario } from '../Torneo/torneoUsuario.entity.js';
import { Transaccion, TipoTransaccion } from './transaccion.entity.js';
import { GameConfig } from '../Config/gameConfig.entity.js';


const PRESUPUESTO_INICIAL = 90000000;
const PRESUPUESTO_MINIMO_EQUIPO = 56000000;
const PRESUPUESTO_MAXIMO_EQUIPO = 70000000;
const PRECIO_MINIMO_ESTRELLA = 8000000;
const PORCENTAJE_VENTA_INSTANTANEA = 0.70; 

/**
 *Limite de jugadores por posición (4-3-3)
 */
const LIMITES_FORMACION = {
  'Goalkeeper': 1,
  'Defender': 4,
  'Midfielder': 3,
  'Attacker': 3
} as const;


/**
 * Selecciona jugadores por posicion y rango de precio
 */
async function seleccionarJugadoresPorPrecio(
  em: EntityManager,
  posicion: string,
  cantidad: number,
  precioMin: number,
  precioMax: number,
  excluirIds: number[] = [],
  torneoId?: number
): Promise<Player[]> {
  const whereConditions: any = {
    posicion: { descripcion: posicion },
    precio_actual: { $gte: precioMin, $lte: precioMax },
    id: { $nin: excluirIds }
  };

  if (torneoId) {
    const equiposDelTorneo = await em.find(Equipo, {
      torneo_usuario: { torneo: torneoId }
    }, { populate: ['jugadores'] });
    const idsAsignados: number[] = [];
    for (const equipo of equiposDelTorneo) {
      const jugadoresEquipo = equipo.jugadores.getItems();
      for (const ej of jugadoresEquipo) {
        const jugadorId = typeof ej.jugador === 'number' ? ej.jugador : (ej.jugador as any).id;
        if (jugadorId) {
          idsAsignados.push(jugadorId);
        }
      }
    }
    if (idsAsignados.length > 0) {
      whereConditions.id = { $nin: [...excluirIds, ...idsAsignados] };
    }
  }

  const jugadores = await em.find(
    Player,
    whereConditions,
    {
      populate: ['posicion'],
      orderBy: { [raw('RAND()')]: 'ASC' },
      limit: cantidad * 3
    }
  );

  if (jugadores.length < cantidad) {
    throw ErrorFactory.badRequest(
      `No hay suficientes jugadores en ${posicion} con precio entre ${precioMin} y ${precioMax}`
    );
  }
  return jugadores.slice(0, cantidad);
}

/**
 * Crea una instancia de Equipo lista para ser persistida.
 * Vincula bidireccionalmente con la inscripción.
 */
export function crearEquipo(nombre: string, inscripcion: TorneoUsuario): Equipo {
  const equipo = new Equipo();
  equipo.nombre = nombre;
  equipo.presupuesto = PRESUPUESTO_INICIAL; 
  equipo.torneo_usuario = inscripcion;
  inscripcion.equipo = equipo; 
  return equipo;
}

/**
 * Pobla un equipo con jugadores considerando presupuesto y precios
 */
export async function poblarEquipoAleatoriamente(
  equipoId: number, 
  transactionalEm: EntityManager
) {
  const equipo = await transactionalEm.findOne(Equipo, { id: equipoId }, { 
    populate: ['torneo_usuario', 'torneo_usuario.torneo'] 
  });
  if (!equipo) {
    throw ErrorFactory.notFound(`Equipo ${equipoId} no encontrado al intentar poblarlo.`);
  }
  const torneoId = equipo.torneo_usuario?.torneo?.id;
  const idsExcluir: number[] = [];
  let costoTotal = 0;
  console.log(`Iniciando poblado de equipo ${equipo.nombre} (Torneo ID: ${torneoId})`);
  const jugadoresSeleccionados: Array<{ jugador: Player; esTitular: boolean }> = [];
  console.log('Paso 1: Seleccionando jugador estrella...');
  
  const probabilidadPosicion = Math.random();
  let posicionEstrella: string;
  
  if (probabilidadPosicion < 0.5) {
    posicionEstrella = 'Attacker';
  } else if (probabilidadPosicion < 0.8) {
    posicionEstrella = 'Midfielder';
  } else if (probabilidadPosicion < 0.95) {
    posicionEstrella = 'Defender';
  } else {
    posicionEstrella = 'Goalkeeper';
  }

  const estrellas = await seleccionarJugadoresPorPrecio(
    transactionalEm,
    posicionEstrella,
    1,
    PRECIO_MINIMO_ESTRELLA,
    100000000,
    idsExcluir,
    torneoId
  );

  const estrella = estrellas[0];
  jugadoresSeleccionados.push({ jugador: estrella, esTitular: true });
  costoTotal += estrella.precio_actual || 0;
  idsExcluir.push(estrella.id!);

  console.log(`Estrella seleccionada: ${estrella.nombre} (${posicionEstrella}) - $${estrella.precio_actual?.toLocaleString()}`);
  console.log('Paso 2: Completando posicion de la estrella...');
  
  const cantidadPorPosicion: Record<string, number> = {
    'Goalkeeper': 1,
    'Defender': 4,
    'Midfielder': 3,
    'Attacker': 3
  };

  const faltanDePosicionEstrella = cantidadPorPosicion[posicionEstrella] - 1;
  
  if (faltanDePosicionEstrella > 0) {
    const complementos = await seleccionarJugadoresPorPrecio(
      transactionalEm,
      posicionEstrella,
      faltanDePosicionEstrella,
      3000000,
      7000000,
      idsExcluir,
      torneoId
    );

    for (const jugador of complementos) {
      jugadoresSeleccionados.push({ jugador, esTitular: true });
      costoTotal += jugador.precio_actual || 0;
      idsExcluir.push(jugador.id!);
    }
  }

  console.log('Paso 3: Completando resto de titulares...');
  const posiciones = ['Goalkeeper', 'Defender', 'Midfielder', 'Attacker'];
  
  for (const pos of posiciones) {
    if (pos === posicionEstrella) continue;

    const cantidad = cantidadPorPosicion[pos];
    let precioMin: number, precioMax: number;

    if (pos === 'Goalkeeper') {
      precioMin = 3000000;
      precioMax = 6000000;
    } else if (pos === 'Defender') {
      precioMin = 2000000;
      precioMax = 6000000;
    } else {
      precioMin = 3000000;
      precioMax = 8000000;
    }

    const jugadores = await seleccionarJugadoresPorPrecio(
      transactionalEm,
      pos,
      cantidad,
      precioMin,
      precioMax,
      idsExcluir,
      torneoId
    );

    for (const jugador of jugadores) {
      jugadoresSeleccionados.push({ jugador, esTitular: true });
      costoTotal += jugador.precio_actual || 0;
      idsExcluir.push(jugador.id!);
    }
  }

  console.log('Paso 4: Seleccionando suplentes...');
  for (const pos of posiciones) {
    const suplente = await seleccionarJugadoresPorPrecio(
      transactionalEm,
      pos,
      1,
      500000,
      2000000,
      idsExcluir,
      torneoId
    );

    jugadoresSeleccionados.push({ jugador: suplente[0], esTitular: false });
    costoTotal += suplente[0].precio_actual || 0;
    idsExcluir.push(suplente[0].id!);
  }

  console.log(`Costo total antes de ajustes: $${costoTotal.toLocaleString()}`);

  let intentos = 0;
  const MAX_INTENTOS = 10;

  while ((costoTotal > PRESUPUESTO_MAXIMO_EQUIPO || costoTotal < PRESUPUESTO_MINIMO_EQUIPO) && intentos < MAX_INTENTOS) {
    intentos++;
    if (costoTotal > PRESUPUESTO_MAXIMO_EQUIPO) {
      console.log(`Ajuste ${intentos}: Costo muy alto, reemplazando jugador caro...`);
      const jugadoresTitulares = jugadoresSeleccionados
        .filter(j => j.esTitular && j.jugador.id !== estrella.id)
        .sort((a, b) => (b.jugador.precio_actual || 0) - (a.jugador.precio_actual || 0));

      if (jugadoresTitulares.length === 0) break;

      const aReemplazar = jugadoresTitulares[0];
      const posicion = aReemplazar.jugador.posicion?.descripcion;
      
      if (!posicion) continue;

      const precioActual = aReemplazar.jugador.precio_actual || 0;
      const nuevoMax = Math.floor(precioActual * 0.7);
      const nuevoMin = Math.max(500000, Math.floor(precioActual * 0.4));

      try {
        const reemplazo = await seleccionarJugadoresPorPrecio(
          transactionalEm,
          posicion,
          1,
          nuevoMin,
          nuevoMax,
          idsExcluir,
          torneoId
        );

        const index = jugadoresSeleccionados.indexOf(aReemplazar);
        costoTotal -= precioActual;
        costoTotal += reemplazo[0].precio_actual || 0;
        
        idsExcluir.splice(idsExcluir.indexOf(aReemplazar.jugador.id!), 1);
        idsExcluir.push(reemplazo[0].id!);
        
        jugadoresSeleccionados[index] = { jugador: reemplazo[0], esTitular: true };
      } catch (error) {
        console.warn('No se pudo encontrar reemplazo, continuando...');
        break;
      }
      
    } else {
      console.log(`Ajuste ${intentos}: Costo muy bajo, mejorando jugador...`);
      
      const jugadoresSuplentes = jugadoresSeleccionados
        .filter(j => !j.esTitular)
        .sort((a, b) => (a.jugador.precio_actual || 0) - (b.jugador.precio_actual || 0));

      if (jugadoresSuplentes.length === 0) break;

      const aReemplazar = jugadoresSuplentes[0];
      const posicion = aReemplazar.jugador.posicion?.descripcion;
      
      if (!posicion) continue;

      const precioActual = aReemplazar.jugador.precio_actual || 0;
      const nuevoMin = Math.floor(precioActual * 1.5);
      const nuevoMax = Math.floor(precioActual * 3);

      try {
        const reemplazo = await seleccionarJugadoresPorPrecio(
          transactionalEm,
          posicion,
          1,
          nuevoMin,
          nuevoMax,
          idsExcluir,
          torneoId
        );

        const index = jugadoresSeleccionados.indexOf(aReemplazar);
        costoTotal -= precioActual;
        costoTotal += reemplazo[0].precio_actual || 0;
        
        idsExcluir.splice(idsExcluir.indexOf(aReemplazar.jugador.id!), 1);
        idsExcluir.push(reemplazo[0].id!);
        
        jugadoresSeleccionados[index] = { jugador: reemplazo[0], esTitular: false };
      } catch (error) {
        console.warn('No se pudo encontrar reemplazo mejor, continuando...');
        break;
      }
    }
  }
  console.log(`Costo total final: $${costoTotal.toLocaleString()}`);

  for (const { jugador, esTitular } of jugadoresSeleccionados) {
    const equipoJugador = transactionalEm.create(EquipoJugador, {
      equipo: equipo,
      jugador: jugador,
      es_titular: esTitular,
      fecha_incorporacion: new Date(), 
      valor_clausula: 0 
    });
    transactionalEm.persist(equipoJugador);
  }
  const presupuestoRestante = equipo.presupuesto - costoTotal;
  equipo.presupuesto = presupuestoRestante;
  console.log(`Presupuesto restante: $${presupuestoRestante.toLocaleString()}`);
  console.log(`Equipo ${equipo.nombre} poblado exitosamente con ${jugadoresSeleccionados.length} jugadores`);
}

/**
 * Obtiene el equipo de un usuario por su ID, incluyendo jugadores, posiciones y clubes.
 * @param userId - El ID del usuario.
 * @returns Una promesa que se resuelve con la entidad Equipo poblada.
 * @throws {ErrorFactory.notFound} Si el usuario no tiene un equipo.
 */
export async function getEquipoById(equipoId: number) {
  const em = orm.em.fork();

  const gameConfig = await em.findOne(GameConfig, 1);
  const diasProteccion = gameConfig?.dias_proteccion_clausula ?? 2;

  const equipo = await em.findOne(
    Equipo,
    { id: equipoId },
    { populate: ['torneo_usuario', 'torneo_usuario.usuario','jugadores.jugador.posicion', 'jugadores.jugador.club'] }
  );
  if (!equipo) {
    throw ErrorFactory.notFound('El equipo no existe');
  }

  equipo.jugadores.getItems().forEach((equipoJugador) => {
    equipoJugador.valor_clausula_efectiva = equipoJugador.getValorClausulaEfectiva();
    equipoJugador.dias_proteccion_restantes = equipoJugador.getDiasProteccionRestantes(diasProteccion);
    equipoJugador.esta_protegido = equipoJugador.estaProtegido(diasProteccion);
  });

  return equipo;
}

/**
 * Intercambia el estado de titularidad entre dos jugadores del mismo equipo.
 * Valida que ambos jugadores pertenezcan al equipo, tengan los roles correctos (titular/suplente)
 * y compartan la misma posición.
 * @param userId - El ID del usuario.
 * @param jugadorTitularId - El ID del jugador actualmente titular.
 * @param jugadorSuplenteId - El ID del jugador actualmente suplente.
 * @returns Una promesa que se resuelve con un mensaje de éxito.
 * @throws {ErrorFactory.notFound} Si el equipo del usuario no se encuentra.
 * @throws {ErrorFactory.badRequest} Si alguna de las validaciones de negocio falla.
 */
export async function cambiarAlineacion(
  equipoId: number,
  jugadorTitularId: number,
  jugadorSuplenteId: number
) {
  return await orm.em.transactional(async (em) => {
    const equipo = await em.findOne(Equipo, { id: equipoId });
    if (!equipo) {
      throw ErrorFactory.notFound('El usuario no tiene un equipo');
    }
    const relacionTitular = await em.findOne(EquipoJugador, {
      equipo: equipo,
      jugador: jugadorTitularId,
    });
    const relacionSuplente = await em.findOne(EquipoJugador, {
      equipo: equipo,
      jugador: jugadorSuplenteId,
    });
    if (!relacionTitular || !relacionSuplente) {
      throw ErrorFactory.badRequest('Ambos jugadores deben pertenecer a tu equipo para ser intercambiados.');
    }
    if (!relacionTitular.es_titular) {
      throw ErrorFactory.badRequest(`El jugador con ID ${jugadorTitularId} no es titular.`);
    }
    if (relacionSuplente.es_titular) {
      throw ErrorFactory.badRequest(`El jugador con ID ${jugadorSuplenteId} no es suplente.`);
    }

    const jugadorTitular = await em.findOne(Player, { id: jugadorTitularId }, { populate: ['posicion'] });
    const jugadorSuplente = await em.findOne(Player, { id: jugadorSuplenteId }, { populate: ['posicion'] });

    if (!jugadorTitular || !jugadorSuplente) {
      throw ErrorFactory.notFound('Uno de los jugadores no fue encontrado.');
    }
    const posicionTitular = jugadorTitular.posicion;
    const posicionSuplente = jugadorSuplente.posicion;

    if (!posicionTitular || !posicionSuplente) {
      throw ErrorFactory.badRequest('Ambos jugadores deben tener una posición definida.');
    }

    if (posicionTitular.id !== posicionSuplente.id) {
      throw ErrorFactory.badRequest(
        `No se puede cambiar la alineación. El jugador titular es ${posicionTitular.descripcion} y el suplente es ${posicionSuplente.descripcion}.`
      );
    }
    relacionTitular.es_titular = false;
    relacionSuplente.es_titular = true;

    return { message: 'Alineación actualizada con éxito.' };
  });
}

/**
 * Cambia el estado de titularidad de un jugador.
 * Si es titular, lo hace suplente. Si es suplente, lo hace titular validando límites de formación.
 * @param equipoId - El ID del equipo.
 * @param jugadorId - El ID del jugador cuyo estado se quiere cambiar.
 * @returns Una promesa que se resuelve con un mensaje de éxito.
 * @throws {ErrorFactory.notFound} Si el equipo o jugador no se encuentra.
 * @throws {ErrorFactory.badRequest} Si se supera el límite de la formación al hacer titular.
 */
export async function cambiarEstadoTitularidad(equipoId: number, jugadorId: number) {
  return await orm.em.transactional(async (em) => {
    const equipo = await em.findOne(
      Equipo,
      { id: equipoId },
      { populate: ['jugadores', 'jugadores.jugador', 'jugadores.jugador.posicion'] }
    );

    if (!equipo) {
      throw ErrorFactory.notFound('El equipo no existe');
    }

    const relacionJugador = await em.findOne(
      EquipoJugador,
      { equipo: equipo, jugador: jugadorId },
      { populate: ['jugador', 'jugador.posicion'] }
    );

    if (!relacionJugador) {
      throw ErrorFactory.notFound('El jugador no pertenece a este equipo');
    }

    const jugador = relacionJugador.jugador as any as Player;
    const posicion = jugador.posicion;

    if (!posicion) {
      throw ErrorFactory.badRequest('El jugador no tiene una posición definida');
    }

    const posicionDescripcion = posicion.descripcion;

    if (!(posicionDescripcion in LIMITES_FORMACION)) {
      throw ErrorFactory.badRequest(`Posición inválida: ${posicionDescripcion}`);
    }

    const estadoActual = relacionJugador.es_titular;
    if (estadoActual) {
      relacionJugador.es_titular = false;

      return {
        message: 'Jugador movido a suplente con éxito',
        jugador: {
          id: jugador.id,
          nombre: jugador.nombre,
          posicion: posicionDescripcion
        },
        estado_anterior: 'titular',
        estado_nuevo: 'suplente'
      };
    }

    const jugadoresEquipo = equipo.jugadores as any as EquipoJugador[];
    const titularesEnPosicion = jugadoresEquipo.filter(ej => {
      if (!ej.es_titular) return false;
      const jugadorItem = ej.jugador as any as Player;
      return jugadorItem.posicion?.descripcion === posicionDescripcion;
    });

    const cantidadTitularesActual = titularesEnPosicion.length;
    const limiteFormacion = LIMITES_FORMACION[posicionDescripcion as keyof typeof LIMITES_FORMACION];

    if (cantidadTitularesActual >= limiteFormacion) {
      throw ErrorFactory.badRequest(
        `No puedes agregar más titulares en la posición ${posicionDescripcion}. ` +
        `Límite de la formación 4-3-3: ${limiteFormacion}. ` +
        `Actualmente tienes ${cantidadTitularesActual} titular(es). ` +
        `Primero debes hacer suplente a otro jugador de esta posición.`
      );
    }

    relacionJugador.es_titular = true;

    return {
      message: 'Jugador promovido a titular con éxito',
      jugador: {
        id: jugador.id,
        nombre: jugador.nombre,
        posicion: posicionDescripcion
      },
      estado_anterior: 'suplente',
      estado_nuevo: 'titular',
      estadisticas_posicion: {
        posicion: posicionDescripcion,
        titulares_actuales: cantidadTitularesActual + 1,
        limite_formacion: limiteFormacion,
        espacios_disponibles: limiteFormacion - (cantidadTitularesActual + 1)
      }
    };
  });
}

/**
 * Vende un jugador del equipo al mercado instantáneamente
 * Devuelve el 70% del precio actual del jugador
 */
export async function venderJugador(equipoId: number, jugadorId: number, userId: number) {
  return await orm.em.transactional(async (em) => {
    const equipoJugador = await em.findOne(
      EquipoJugador,
      { equipo: equipoId, jugador: jugadorId },
      { populate: ['equipo', 'equipo.torneo_usuario', 'equipo.torneo_usuario.usuario', 'jugador'] }
    );

    if (!equipoJugador) {
      throw ErrorFactory.notFound('El jugador no pertenece a tu equipo');
    }

    const equipo = equipoJugador.equipo as any as Equipo;
    const jugador = equipoJugador.jugador as any as Player;

    const ownerId = equipo.torneo_usuario.usuario.id;
    if (ownerId !== userId) {
      throw ErrorFactory.forbidden('No tienes permisos para vender jugadores de este equipo');
    }
    const precioActual = jugador.precio_actual || 0;
    
    if (precioActual <= 0) {
      throw ErrorFactory.badRequest('El jugador no tiene un precio válido');
    }

    const devolucion = Math.floor(precioActual * PORCENTAJE_VENTA_INSTANTANEA);
    equipo.presupuesto += devolucion;

    const transaccion = em.create(Transaccion, {
      equipo,
      tipo: TipoTransaccion.VENTA_INSTANTANEA,
      monto: devolucion,
      jugador,
      fecha: new Date(),
      descripcion: `Venta instantánea de ${jugador.nombre} (${PORCENTAJE_VENTA_INSTANTANEA * 100}% de $${precioActual.toLocaleString()})`
    });
    em.persist(transaccion);
    em.remove(equipoJugador);
    return {
      jugador: {
        id: jugador.id,
        nombre: jugador.nombre,
        precio_actual: precioActual
      },
      devolucion,
      porcentaje: PORCENTAJE_VENTA_INSTANTANEA * 100,
      presupuesto_nuevo: equipo.presupuesto,
      cantidad_jugadores_restantes: equipo.jugadores.length - 1
    };
  });
}