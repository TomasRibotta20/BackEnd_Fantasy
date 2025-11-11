import { raw, EntityManager } from '@mikro-orm/core';
import { orm } from '../shared/db/orm.js';
import { Player } from '../Player/player.entity.js';
import { Equipo } from './equipo.entity.js';
import { Users } from '../User/user.entity.js';
import { ErrorFactory } from '../shared/errors/errors.factory.js';
import { EquipoJugador } from './equipoJugador.entity.js';

/**
 * Selecciona una cantidad específica de jugadores de una posición dada, de forma aleatoria.
 * @param em - El EntityManager transaccional.
 * @param posicion - La descripción de la posición a buscar (ej. 'Goalkeeper').
 * @param cantidad - El número de jugadores a seleccionar.
 * @param excluirIds - Un array de IDs de jugadores a excluir de la selección.
 * @returns Una promesa que se resuelve con un array de entidades Player.
 * @throws {ErrorFactory.badRequest} Si no se encuentran suficientes jugadores.
 */
async function seleccionarJugadores(
  em: EntityManager,
  posicion: string,
  cantidad: number,
  excluirIds: number[] = []
) {
  const jugadores = await em.find(
    Player,
    {
      position: { description: posicion },
      id: { $nin: excluirIds },
    },
    {
      populate: ['position'],
      orderBy: { [raw('RAND()')]: 'ASC' },
      limit: cantidad, // Solo traer la cantidad exacta que necesitas
    }
  );

  if (jugadores.length < cantidad) {
    throw ErrorFactory.badRequest(`No hay suficientes jugadores en la posición: ${posicion}`);
  }

  return jugadores;
}
/**
 * Crea un nuevo equipo para un usuario, realizando un draft automático de jugadores.
 * La operación es transaccional: o se completa del todo, o no se hace nada.
 * @param nombreEquipo - El nombre del equipo a crear.
 * @param userId - El ID del usuario para el cual se crea el equipo.
 * @returns Una promesa que se resuelve con la nueva entidad Equipo creada.
 * @throws {ErrorFactory.notFound} Si el usuario no existe.
 * @throws {ErrorFactory.duplicate} Si el usuario ya tiene un equipo.
 */
export async function crearEquipoConDraft(nombreEquipo: string, userId: number) {
  return await orm.em.transactional(async (transactionalEm) => {
    const usuario = await transactionalEm.findOne(Users, { id: userId });
    if (!usuario) {
      throw ErrorFactory.notFound('Usuario no encontrado');
    }

    const equipoExistente = await transactionalEm.findOne(Equipo, { usuario });
    if (equipoExistente) {
      throw ErrorFactory.duplicate('El usuario ya tiene un equipo creado');
    }

    const arquerosTitulares = await seleccionarJugadores(transactionalEm, 'Goalkeeper', 1);
    const defensoresTitulares = await seleccionarJugadores(transactionalEm, 'Defender', 4);
    const mediocampistasTitulares = await seleccionarJugadores(transactionalEm, 'Midfielder', 3);
    const delanterosTitulares = await seleccionarJugadores(transactionalEm, 'Attacker', 3);

    const todosLosTitulares = [
      ...arquerosTitulares,
      ...defensoresTitulares,
      ...mediocampistasTitulares,
      ...delanterosTitulares,
    ];
    const idsExcluir = todosLosTitulares
      .map((p) => p.id)
      .filter((id): id is number => id !== undefined && id !== null);

    const arqueroSuplente = await seleccionarJugadores(transactionalEm, 'Goalkeeper', 1, idsExcluir);
    const defensorSuplente = await seleccionarJugadores(transactionalEm, 'Defender', 1, idsExcluir);
    const mediocampistaSuplente = await seleccionarJugadores(transactionalEm, 'Midfielder', 1, idsExcluir);
    const delanteroSuplente = await seleccionarJugadores(transactionalEm, 'Attacker', 1, idsExcluir);

    const todosLosSuplentes = [
      ...arqueroSuplente,
      ...defensorSuplente,
      ...mediocampistaSuplente,
      ...delanteroSuplente,
    ];

    const nuevoEquipo = transactionalEm.create(Equipo, {
      nombre: nombreEquipo,
      usuario: usuario,
    });

    for (const jugador of todosLosTitulares) {
      const equipoJugador = transactionalEm.create(EquipoJugador, {
        equipo: nuevoEquipo,
        jugador: jugador,
        es_titular: true,
      });
      transactionalEm.persist(equipoJugador);
    }

    for (const jugador of todosLosSuplentes) {
      const equipoJugador = transactionalEm.create(EquipoJugador, {
        equipo: nuevoEquipo,
        jugador: jugador,
        es_titular: false,
      });
      transactionalEm.persist(equipoJugador);
    }

    await transactionalEm.persistAndFlush(nuevoEquipo);

    return nuevoEquipo;
  });
}
/**
 * Obtiene el equipo de un usuario por su ID, incluyendo jugadores, posiciones y clubes.
 * @param userId - El ID del usuario.
 * @returns Una promesa que se resuelve con la entidad Equipo poblada.
 * @throws {ErrorFactory.notFound} Si el usuario no tiene un equipo.
 */
export async function getEquipoByUserId(userId: number) {
  const em = orm.em.fork();
  const equipo = await em.findOne(
    Equipo,
    { usuario: userId },
    { populate: ['jugadores.jugador.position', 'jugadores.jugador.club'] }
  );

  if (!equipo) {
    throw ErrorFactory.notFound('El usuario no tiene un equipo');
  }

  return equipo;
}
/**
 * Realiza un intercambio atómico de un jugador del equipo por uno Cualquiera de los existentes.
 * Valida que ambos jugadores existan y sean de la misma posición.
 * @param userId - El ID del usuario que realiza el intercambio.
 * @param jugadorSaleId - El ID del jugador que sale del equipo.
 * @param jugadorEntraId - El ID del jugador que entra al equipo.
 * @returns Una promesa que se resuelve con un mensaje de éxito.
 * @throws {ErrorFactory.notFound} Si el equipo o uno de los jugadores no se encuentra.
 * @throws {ErrorFactory.badRequest} Si las validaciones de negocio fallan (posiciones, pertenencia).
 * @throws {ErrorFactory.duplicate} Si el jugador que entra ya está en el equipo.
 */
export async function intercambiarJugador(
  userId: number,
  jugadorSaleId: number,
  jugadorEntraId: number
) {
  return await orm.em.transactional(async (em) => {
    // 1. Buscar el equipo del usuario.
    const equipo = await em.findOne(Equipo, { usuario: userId });
    if (!equipo) {
      throw ErrorFactory.notFound('El usuario no tiene un equipo');
    }

    // 2. Validar que el jugador que SALE está en el equipo.
    const relacionSale = await em.findOne(EquipoJugador, {
      equipo: equipo,
      jugador: jugadorSaleId,
    });
    if (!relacionSale) {
      throw ErrorFactory.badRequest('El jugador que intentas dar de baja no está en tu equipo');
    }

    // 3. Validar que el jugador que ENTRA no esté ya en el equipo.
    const relacionEntraExistente = await em.findOne(EquipoJugador, {
      equipo: equipo,
      jugador: jugadorEntraId,
    });
    if (relacionEntraExistente) {
      throw ErrorFactory.duplicate('El jugador que intentas fichar ya está en tu equipo');
    }

    // 4. Cargar las entidades COMPLETAS de los jugadores con sus posiciones.
    // Esta es la forma más segura de garantizar que tenemos todos los datos.
    const jugadorSale = await em.findOne(Player, { id: jugadorSaleId }, { populate: ['position'] });
    const jugadorEntra = await em.findOne(Player, { id: jugadorEntraId }, { populate: ['position'] });

    // 5. Validar existencia de los jugadores y sus posiciones.
    if (!jugadorSale || !jugadorEntra) {
      throw ErrorFactory.notFound('Uno de los jugadores involucrados en el intercambio no fue encontrado.');
    }
    const posicionSale = jugadorSale.position;
    const posicionEntra = jugadorEntra.position;

    if (!posicionSale || !posicionEntra) {
      throw ErrorFactory.badRequest('Ambos jugadores deben tener una posición definida para ser intercambiados.');
    }

    // 6. Validar que las posiciones coincidan.
    if (posicionSale.id !== posicionEntra.id) {
      throw ErrorFactory.badRequest(
        `No se puede intercambiar. El jugador que sale es ${posicionSale.description} y el que entra es ${posicionEntra.description}.`
      );
    }

    // 7. Ejecutar el intercambio.
    const eraTitular = relacionSale.es_titular;
    em.remove(relacionSale); // Elimina la relación antigua.

    const nuevaRelacion = em.create(EquipoJugador, {
      equipo: equipo,
      jugador: jugadorEntra, // Asigna la entidad completa del jugador que entra.
      es_titular: eraTitular,
    });
    em.persist(nuevaRelacion); // Persiste la nueva relación.

    return { message: 'Intercambio realizado con éxito' };
  });
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
  userId: number,
  jugadorTitularId: number,
  jugadorSuplenteId: number
) {
  return await orm.em.transactional(async (em) => {
    // 1. Buscar el equipo del usuario.
    const equipo = await em.findOne(Equipo, { usuario: userId });
    if (!equipo) {
      throw ErrorFactory.notFound('El usuario no tiene un equipo');
    }

    // 2. Buscar las relaciones de AMBOS jugadores con el equipo.
    const relacionTitular = await em.findOne(EquipoJugador, {
      equipo: equipo,
      jugador: jugadorTitularId,
    });
    const relacionSuplente = await em.findOne(EquipoJugador, {
      equipo: equipo,
      jugador: jugadorSuplenteId,
    });

    // 3. Validar que ambos jugadores pertenezcan al equipo.
    if (!relacionTitular || !relacionSuplente) {
      throw ErrorFactory.badRequest('Ambos jugadores deben pertenecer a tu equipo para ser intercambiados.');
    }

    // 4. Validar que sus estados de titularidad sean los correctos.
    if (!relacionTitular.es_titular) {
      throw ErrorFactory.badRequest(`El jugador con ID ${jugadorTitularId} no es titular.`);
    }
    if (relacionSuplente.es_titular) {
      throw ErrorFactory.badRequest(`El jugador con ID ${jugadorSuplenteId} no es suplente.`);
    }

    // 5. Cargar las entidades COMPLETAS de los jugadores con sus posiciones.
    //    (Aplicando la misma lógica que en 'intercambiarJugador')
    const jugadorTitular = await em.findOne(Player, { id: jugadorTitularId }, { populate: ['position'] });
    const jugadorSuplente = await em.findOne(Player, { id: jugadorSuplenteId }, { populate: ['position'] });

    // 6. Validar existencia de jugadores y posiciones.
    if (!jugadorTitular || !jugadorSuplente) {
      throw ErrorFactory.notFound('Uno de los jugadores no fue encontrado.');
    }
    const posicionTitular = jugadorTitular.position;
    const posicionSuplente = jugadorSuplente.position;

    if (!posicionTitular || !posicionSuplente) {
      throw ErrorFactory.badRequest('Ambos jugadores deben tener una posición definida.');
    }

    // 7. Validar que las posiciones coincidan.
    if (posicionTitular.id !== posicionSuplente.id) {
      throw ErrorFactory.badRequest(
        `No se puede cambiar la alineación. El jugador titular es ${posicionTitular.description} y el suplente es ${posicionSuplente.description}.`
      );
    }

    // 8. Ejecutar el intercambio de estado.
    relacionTitular.es_titular = false;
    relacionSuplente.es_titular = true;

    return { message: 'Alineación actualizada con éxito.' };
  });
}