import { Request, Response, NextFunction } from 'express';
import { Player } from './player.entity.js';
import { orm } from '../shared/db/orm.js';
import { findAndPaginate } from './player.service.js';
import { ErrorFactory } from '../shared/errors/errors.factory.js';
//Definimos una variable para el entityManager
const em = orm.em;

/**
 * Recupera todos los jugadores de la base de datos
 * @param req El objeto de solicitud de Express (no utilizado en este endpoint, pero se mantiene para la firma).
 * @param res El objeto de respuesta de Express para enviar los resultados.
 * @returns Una respuesta HTTP 200 con la lista de jugadores encontrados o un mensaje de error y una respuesta HTTP 500.
 */
async function findAll(req: Request, res: Response){
    try{
        const players = await em.find(Player, {}, {orderBy: {id: 'ASC'}});
        res.status(200).json({message: 'found all Players', data: players})
    }catch (error:any) {
        res.status(500).json({message: 'Error finding players', error: error.message})
    }
}

/**
 * Recupera un jugador por su ID
 * @param req El objeto de solicitud de Express que contiene el ID del jugador en los parámetros de la URL.
 * @param res El objeto de respuesta de Express para enviar los resultados.
 * @returns Una respuesta HTTP 200 con el jugador encontrado o un mensaje de error y una respuesta HTTP 500.
 */
async function findOne(req: Request, res: Response){
    try{
        const id = Number.parseInt(req.params.id);
        const player = await em.findOne(Player, {id});
        if (!player) {
            return res.status(404).json({message: 'Player not found'});
        }
        res.status(200).json({message: 'found Player', data: player});
    }catch (error:any) {
        res.status(500).json({message: 'Error finding player', error: error.message});
    }
}

/**
 * Agrega un nuevo jugador a la base de datos
 * @param req El objeto de solicitud de Express que contiene los datos del nuevo jugador en el cuerpo de la solicitud.
 * @param res El objeto de respuesta de Express para enviar los resultados.
 * @returns Una respuesta HTTP 201 con el jugador creado o un mensaje de error y una respuesta HTTP 500.
 */
async function add(req: Request, res: Response){
    try{
        const player = em.create(Player, req.body);
        await em.persistAndFlush(player);
        res.status(201).json({message: 'Player created', data: player});
    }catch (error:any) {
        res.status(500).json({message: 'Error creating player', error: error.message});
    }
}

/**
 * Elimina un jugador de la base de datos
 * @param req El objeto de solicitud de Express que contiene el ID del jugador en los parámetros de la URL.
 * @param res El objeto de respuesta de Express para enviar los resultados.
 * @returns Una respuesta HTTP 200 con el jugador eliminado o un mensaje de error y una respuesta HTTP 500.
 */
async function remove(req: Request, res: Response){
    try{
        const id = Number.parseInt(req.params.id);
        const player = await em.findOne(Player, {id});
        if (!player) {
            return res.status(404).json({message: 'Player not found'});
        }
        await em.removeAndFlush(player);
        res.status(200).json({message: 'Player removed', data: player});
    }catch (error:any) {
        res.status(500).json({message: 'Error removing player', error: error.message});
    }
}

/**
 * Actualiza un jugador existente en la base de datos
 * @param req El objeto de solicitud de Express que contiene el ID del jugador en los parámetros de la URL y los datos actualizados en el cuerpo de la solicitud.
 * @param res El objeto de respuesta de Express para enviar los resultados.
 * @returns Una respuesta HTTP 200 con el jugador actualizado o un mensaje de error y una respuesta HTTP 500.
 */
async function update(req: Request, res: Response){
    try{
        const id = Number.parseInt(req.params.id);
        const player = await em.findOne(Player, {id});
        if (!player) {
            return res.status(404).json({message: 'Player not found'});
        }
        em.assign(player, req.body);
        await em.persistAndFlush(player);
        res.status(200).json({message: 'Player updated', data: player});
    }catch (error:any) {
        res.status(500).json({message: 'Error updating player', error: error.message});
    }
}
/**
 * Maneja la petición para obtener una lista paginada y filtrada de jugadores.
 * @param {Request} req - El objeto de solicitud de Express con query params: name, position, club, page, limit.
 * @param {Response} res - El objeto de respuesta de Express.
 * @param {NextFunction} next - La función para pasar el control al siguiente middleware.
 * @returns {Promise<Response|void>} Una promesa que se resuelve en una respuesta JSON con los jugadores filtrados o pasa un error a next.
 */
 async function getPlayers(req: Request, res: Response, next: NextFunction) {
  try {
    // Parsear los parámetros de consulta
    const name = req.query.name as string;
    const position = req.query.position as string;
    const club = req.query.club as string;
    const page = req.query.page ? parseInt(req.query.page as string) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

    const result = await findAndPaginate({
      name,
      position,
      club,
      page,
      limit
    });
    
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error en getPlayers:', error);
    return next(ErrorFactory.internal('Error al obtener jugadores'));
  }
}
export {findAll, findOne, add, remove, update, getPlayers};