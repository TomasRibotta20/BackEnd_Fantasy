import { Request, Response, NextFunction } from 'express';
import { Player } from './player.entity.js';
import { orm } from '../shared/db/orm.js';
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
export {findAll, findOne, add, remove, update};