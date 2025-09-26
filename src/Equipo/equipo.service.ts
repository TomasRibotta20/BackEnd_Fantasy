import { raw, EntityManager } from '@mikro-orm/core';
import { orm } from '../shared/db/orm.js';
import { Player } from '../Player/player.entity.js';
import { Equipo } from './equipo.entity.js';
import { Users } from '../User/user.entity.js';
import { ErrorFactory } from '../shared/errors/errors.factory.js';
import { EquipoJugador } from './equipoJugador.entity.js'; // ¡Importante!

// La función auxiliar ahora recibe el EntityManager como parámetro
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
      orderBy: { id: 'ASC' }, // You can randomize in JS if needed, MikroORM does not support RAND() natively
      limit: cantidad,
      populate: ['position'],
    }
  );

  // Optional: Shuffle the array to simulate random selection
  const shuffled = jugadores.sort(() => Math.random() - 0.5).slice(0, cantidad);

  if (shuffled.length < cantidad) {
    throw ErrorFactory.forbidden(`No hay suficientes jugadores en la posición: ${posicion}`);
  }

  return shuffled;
}

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

    // 1. Seleccionar Jugadores
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

    // 2. Crear la instancia del Equipo
    const nuevoEquipo = transactionalEm.create(Equipo, {
      nombre: nombreEquipo,
      usuario: usuario,
    });

    // 3. CORRECCIÓN: Crear las entidades 'EquipoJugador' para vincular
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

    // 4. Persistir el equipo (y las relaciones en cascada)
    await transactionalEm.persistAndFlush(nuevoEquipo);

    return nuevoEquipo;
  });
}

// La función getEquipoByUserId que creamos antes también necesita un pequeño ajuste
export async function getEquipoByUserId(userId: number) {
  const em = orm.em.fork();
  const equipo = await em.findOne(
    Equipo,
    { usuario: { id: userId } },
    // Asegúrate de que el populate sea correcto para el nuevo modelo
    { populate: ['jugadores.jugador.position', 'jugadores.jugador.club'] }
  );

  if (!equipo) {
    throw ErrorFactory.notFound('El usuario no tiene un equipo');
  }

  return equipo;
}

