/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import { Clubs } from './club.entity.js';
import { orm } from '../shared/db/orm.js';

const em = orm.em;

/**
 * Recupera todos los clubes de la base de datos.
 * @param req El objeto de solicitud de Express (no utilizado en este endpoint, pero se mantiene para la firma).
 * @param res El objeto de respuesta de Express para enviar los resultados.
 * @returns Una respuesta HTTP 200 con un mensaje y una lista de clubes, o un error HTTP 500 si falla.
 */
async function findAll(req: Request, res: Response) {
  try {
    const clubs = await em.find(Clubs, {});
    res.status(200).json({ message: 'found all Clubs', data: clubs });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}
/**
 * Recupera un club de la base de datos.
 * @param req El objeto de solicitud de Express que contiene el ID del club en los parámetros.
 * @param res El objeto de respuesta de Express para enviar los resultados.
 * @returns Una respuesta HTTP 200 con un mensaje y los datos del club, o un error HTTP 500 si falla.
 */
async function findOne(req: Request, res: Response) {
  try {
    const id = Number.parseInt(req.params.id);
    const club = await em.findOneOrFail(Clubs, { id });
    res.status(200).json({ message: 'found club', data: club });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

/**
 * Agrega un nuevo club a la base de datos.
 * @param req El objeto de solicitud de Express que contiene los datos del club en el cuerpo.
 * @param res El objeto de respuesta de Express para enviar los resultados.
 * @returns Una respuesta HTTP 201 con un mensaje de éxito y los datos del club creado, o un error HTTP 500 si falla.
 */
async function add(req: Request, res: Response) {
  try {
    const club = em.create(Clubs, req.body);
    await em.flush();
    res.status(201).json({ message: 'club created', data: club });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

/**
 * Actualiza un club existente en la base de datos.
 * @param req El objeto de solicitud de Express que contiene el ID del club en los parámetros y los datos a actualizar en el cuerpo.
 * @param res El objeto de respuesta de Express para enviar los resultados.
 * @returns Una respuesta HTTP 200 con un mensaje de éxito, o un error HTTP 500 si falla.
 */
async function update(req: Request, res: Response) {
  try {
    const id = Number.parseInt(req.params.id);
    const club = em.getReference(Clubs, id);
    em.assign(club, req.body);
    await em.flush();
    res.status(200).json({ message: 'club updated' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}
/**
 * Elimina un club de la base de datos.
 * @param req El objeto de solicitud de Express que contiene el ID del club en los parámetros.
 * @param res El objeto de respuesta de Express para enviar los resultados.
 * @returns Una respuesta HTTP 200 con un mensaje de éxito, o un error HTTP 500 si falla.
 */
async function remove(req: Request, res: Response) {
  try {
    const id = Number.parseInt(req.params.id);
    const club = em.getReference(Clubs, id);
    await em.removeAndFlush(club);
    res.status(200).send({ message: 'club deleted' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

export { findAll, findOne, add, update, remove };
