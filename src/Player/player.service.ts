import { orm } from '../shared/db/orm.js';
import { Player } from './player.entity.js';
import { FilterQuery, FindOptions, QueryOrder } from '@mikro-orm/core';

/**
 * Busca y filtra jugadores con paginación.
 * @param filters - Objeto con los filtros a aplicar (name, position, club, page, limit).
 * @returns Una promesa que se resuelve en un objeto con los jugadores y metadatos de paginación.
 */
export async function findAndPaginate({
  name, 
  position, 
  club, 
  page = 1, 
  limit = 20
}: { 
  name?: string; 
  position?: string; 
  club?: string; 
  page?: number; 
  limit?: number; 
}) {
  const em = orm.em.fork();
  
  const where: FilterQuery<Player> = {};
  if (name) {
    where.$or = [
      { nombre: { $re: `(?i).*${name}.*` } },
      { primer_nombre: { $re: `(?i).*${name}.*` } },
      { apellido: { $re: `(?i).*${name}.*` } },
    ];
  }

  if (position) {
    const positionFilter = !isNaN(Number(position)) 
      ? { id: Number(position) } 
      : { description: { $re: `(?i).*${position}.*` } };
    
    where.posicion = positionFilter;
  }

  if (club) {
    const clubFilter = !isNaN(Number(club))
      ? { id: Number(club) }
      : { nombre: { $re: `(?i).*${club}.*` } };
    
    where.club = clubFilter;
  }

  const offset = (page - 1) * limit;
  const options: FindOptions<Player, 'position' | 'club'> = {
    populate: ['posicion', 'club'],
    orderBy: { nombre: QueryOrder.ASC },
    limit,
    offset,
  };

  const [players, totalItems] = await em.findAndCount(Player, where, options);

  return {
    data: players,
    meta: {
      totalItems,
      currentPage: page,
      itemsPerPage: limit,
      totalPages: Math.ceil(totalItems / limit),
    },
  };
}