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
  // Usar una única conexión al EntityManager para toda la función
  const em = orm.em.fork();
  
  const where: FilterQuery<Player> = {};

  if (name) {
    // Búsqueda case-insensitive usando regexp en lugar de ilike (más portable)
    where.$or = [
      { name: { $re: `(?i).*${name}.*` } },
      { firstname: { $re: `(?i).*${name}.*` } },
      { lastname: { $re: `(?i).*${name}.*` } },
    ];
  }

  if (position) {
    // Filtro por ID de posición si es numérico, o por descripción si es texto
    const positionFilter = !isNaN(Number(position)) 
      ? { id: Number(position) } 
      : { description: { $re: `(?i).*${position}.*` } };
    
    where.position = positionFilter;
  }

  if (club) {
    // Similar a position, permite filtrar por ID o por nombre
    const clubFilter = !isNaN(Number(club))
      ? { id: Number(club) }
      : { nombre: { $re: `(?i).*${club}.*` } };
    
    where.club = clubFilter;
  }

  const offset = (page - 1) * limit;
  
  // Usar un tipo más específico para FindOptions que incluya las relaciones de Player
  const options: FindOptions<Player, 'position' | 'club'> = {
    populate: ['position', 'club'],
    orderBy: { name: QueryOrder.ASC },
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