import { raw } from '@mikro-orm/core';
import { orm } from '../shared/db/orm.js';
import { Player } from '../Player/player.entity.js';
import { Equipo } from './equipo.entity.js';
import { Users } from '../User/user.entity.js';
import { ErrorFactory } from '../shared/errors/errors.factory.js';

const em = orm.em.fork();

// Función auxiliar para seleccionar jugadores aleatorios por posición
async function seleccionarJugadores(posicion: string, cantidad: number, excluirIds: number[] = []) {
  const qb = em.createQueryBuilder(Player, 'p');

  const jugadores = await qb
    .select('p.*')
    .leftJoinAndSelect('p.position', 'pos')
    .where({
      'pos.description': posicion,
      equipo: null,
      id: { $nin: excluirIds }, // Excluir jugadores ya seleccionados
    })
    .orderBy({ [raw('RAND()')]: 'ASC' })
    .limit(cantidad)
    .getResultList();

  if (jugadores.length < cantidad) {
    throw ErrorFactory.notFound(`No hay suficientes jugadores libres en la posición: ${posicion}`);
  }

  return jugadores;
}

export async function crearEquipoConDraft(nombreEquipo: string, userId: number) {
  // Usamos una transacción para asegurar que todo se cree correctamente o no se cree nada
  return await em.transactional(async (em) => {
    const usuario = await em.findOne(Users, { id: userId });
    if (!usuario) {
      throw ErrorFactory.notFound('Usuario no encontrado');
    }

    const equipoExistente = await em.findOne(Equipo, { usuario });
    if (equipoExistente) {
      throw ErrorFactory.duplicate('El usuario ya tiene un equipo creado');
    }

    // 1. Seleccionar Jugadores
    const arquerosTitulares = await seleccionarJugadores('Goalkeeper', 1);
    const defensoresTitulares = await seleccionarJugadores('Defender', 4);
    const mediocampistasTitulares = await seleccionarJugadores('Midfielder', 3);
    const delanterosTitulares = await seleccionarJugadores('Attacker', 3);

    const todosLosTitulares = [
      ...arquerosTitulares,
      ...defensoresTitulares,
      ...mediocampistasTitulares,
      ...delanterosTitulares,
    ];
     const idsExcluir = todosLosTitulares
      .map((p) => p.id)
      .filter((id): id is number => id !== undefined && id !== null);

    const arqueroSuplente = await seleccionarJugadores('Goalkeeper', 1, idsExcluir);
    const defensorSuplente = await seleccionarJugadores('Defender', 1, idsExcluir);
    const mediocampistaSuplente = await seleccionarJugadores('Midfielder', 1, idsExcluir);
    const delanteroSuplente = await seleccionarJugadores('Attacker', 1, idsExcluir);

    const todosLosSuplentes = [
      ...arqueroSuplente,
      ...defensorSuplente,
      ...mediocampistaSuplente,
      ...delanteroSuplente,
    ];

    // 2. Crear la instancia del Equipo
    const nuevoEquipo = em.create(Equipo, {
      nombre: nombreEquipo,
      usuario: usuario,
    });

    // 3. Asignar jugadores al equipo y marcar su estado (titular/suplente)
    todosLosTitulares.forEach((jugador) => {
      jugador.equipo = nuevoEquipo;
      jugador.es_titular = true;
      //em.persist(jugador);
    });

    todosLosSuplentes.forEach((jugador) => {
      jugador.equipo = nuevoEquipo;
      jugador.es_titular = false;
      //em.persist(jugador);
    });

    // 4. Persistir el equipo (los jugadores se persistirán en cascada por la transacción)
    await em.persistAndFlush(nuevoEquipo);

    return nuevoEquipo;
  });
}