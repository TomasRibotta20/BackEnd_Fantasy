/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from 'express';
import { Player } from './player.entity.js';
import { orm } from '../shared/db/orm.js';
import { ErrorFactory } from '../shared/errors/errors.factory.js';
//Definimos una variable para el entityManager
const em = orm.em;

/**
 * Recupera todos los jugadores de la base de datos
 * @param req El objeto de solicitud de Express (no utilizado en este endpoint, pero se mantiene para la firma).
 * @param res El objeto de respuesta de Express para enviar los resultados.
 * @returns Una respuesta HTTP 200 con la lista de jugadores encontrados o un mensaje de error y una respuesta HTTP 500.
 */
async function findAll(req: Request, res: Response, next: NextFunction){
    try{
        const players = await em.find(Player, {}, {orderBy: {id: 'ASC'}});
        res.status(200).json({message: 'found all Players', data: players})
    }catch (error: any) {
        next(ErrorFactory.internal('Error finding players'));
    }
}

/**
 * Recupera un jugador por su ID
 * @param req El objeto de solicitud de Express que contiene el ID del jugador en los parámetros de la URL.
 * @param res El objeto de respuesta de Express para enviar los resultados.
 * @returns Una respuesta HTTP 200 con el jugador encontrado o un mensaje de error y una respuesta HTTP 404, 500 si falla.
 */
async function findOne(req: Request, res: Response, next: NextFunction){
    const id = Number.parseInt(req.params.id);
    try{
        const player = await em.findOneOrFail(Player, {id});
        res.status(200).json({message: 'found Player', data: player});
    }catch (error: any) {
        if (error.name === 'NotFoundError') {
            return next(ErrorFactory.notFound(`Jugador con ID ${id} no encontrado`));
        }
        next(ErrorFactory.internal('Error al obtener el jugador'));
    }
}

/**
 * Agrega un nuevo jugador a la base de datos
 * @param req El objeto de solicitud de Express que contiene los datos del nuevo jugador en el cuerpo de la solicitud.
 * @param res El objeto de respuesta de Express para enviar los resultados.
 * @returns Una respuesta HTTP 201 con el jugador creado o un mensaje de error y una respuesta HTTP 400, 409, 500 si falla.
 */
async function add(req: Request, res: Response, next: NextFunction){
    try{
        const player = em.create(Player, req.body);
        await em.persistAndFlush(player);
        res.status(201).json({message: 'Player created', data: player});
    }catch (error:any) {
        if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
            return next(ErrorFactory.duplicate('Ya existe un jugador con ese nombre'));
        }
        next(ErrorFactory.internal('Error al crear el jugador'));
    }
}

/**
 * Elimina un jugador de la base de datos
 * @param req El objeto de solicitud de Express que contiene el ID del jugador en los parámetros de la URL.
 * @param res El objeto de respuesta de Express para enviar los resultados.
 * @returns Una respuesta HTTP 200 con el jugador eliminado o un mensaje de error y una respuesta HTTP 500 si falla.
 */
async function remove(req: Request, res: Response, next: NextFunction){
    try{
        const id = Number.parseInt(req.params.id);
        const player = em.getReference(Player, id);
        await em.removeAndFlush(player);
        res.status(200).json({message: 'Player removed', data: player});
    }catch (error: any) {
        next(ErrorFactory.internal('Error al eliminar el jugador'));
    }
}

/**
 * Actualiza un jugador existente en la base de datos
 * @param req El objeto de solicitud de Express que contiene el ID del jugador en los parámetros de la URL y los datos actualizados en el cuerpo de la solicitud.
 * @param res El objeto de respuesta de Express para enviar los resultados.
 * @returns Una respuesta HTTP 200 con el jugador actualizado o un mensaje de error y una respuesta HTTP 404, 409, 500 si falla.
 */
async function update(req: Request, res: Response, next: NextFunction){
    const id = Number.parseInt(req.params.id);
    try{
        const player = await em.findOneOrFail(Player, {id});
        em.assign(player, req.body);
        await em.persistAndFlush(player);
        res.status(200).json({message: 'Player updated', data: player});
    }catch (error: any) {
        if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
            return next(ErrorFactory.duplicate('Ya existe un jugador con esa descripción'));
        }
        if (error.name === 'NotFoundError') {
            return next(ErrorFactory.notFound(`Jugador con ID ${id} no encontrado`));
        }
        next(ErrorFactory.internal('Error al actualizar el jugador'));
    }
}
export {findAll, findOne, add, remove, update};