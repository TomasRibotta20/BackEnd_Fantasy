/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from 'express';
import { clubes } from './club.entity.js';
import { orm } from '../shared/db/orm.js';
import { ErrorFactory } from '../shared/errors/errors.factory.js';

const em = orm.em;

/**
 * Recupera todos los clubes de la base de datos.
 * @param req El objeto de solicitud de Express (no utilizado en este endpoint, pero se mantiene para la firma).
 * @param res El objeto de respuesta de Express para enviar los resultados.
 * @returns Una respuesta HTTP 200 con un mensaje y una lista de clubes, o un error HTTP 500 si falla.
 */
async function findAll(req: Request, res: Response, next: NextFunction) {
  try {
    const clubs = await em.find(clubes, {}, { orderBy: { id: 'ASC' } });
    res.status(200).json({ message: 'found all Clubs', data: clubs });
  } catch (error: any) {
    next(ErrorFactory.internal(`Error al obtener los clubes`));
  }
}
/**
 * Recupera un club de la base de datos.
 * @param req El objeto de solicitud de Express que contiene el ID del club en los parámetros.
 * @param res El objeto de respuesta de Express para enviar los resultados.
 * @returns Una respuesta HTTP 200 con un mensaje y los datos del club, o un error HTTP 500 si falla.
 */
async function findOne(req: Request, res: Response, next: NextFunction) {
  const id = Number.parseInt(req.params.id);
  try {
    const club = await em.findOneOrFail(clubes, { id });
    res.status(200).json({ message: 'found club', data: club });
  } catch (error: any) {
    if (error.name === 'NotFoundError') {
      return next(ErrorFactory.notFound(`Club con ID ${id} no encontrado`));
    }
    next(ErrorFactory.internal('Error al obtener el club'));
  }
}

/**
 * Agrega un nuevo club a la base de datos.
 * @param req El objeto de solicitud de Express que contiene los datos del club en el cuerpo.
 * @param res El objeto de respuesta de Express para enviar los resultados.
 * @returns Una respuesta HTTP 201 con un mensaje de éxito y los datos del club creado, o un error HTTP 500 si falla.
 */
async function add(req: Request, res: Response, next: NextFunction) {
  try {
    const club = em.create(clubes, req.body);
    await em.flush();
    res.status(201).json({ message: 'club created', data: club });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
      return next(ErrorFactory.duplicate('Ya existe un club con esa descripción'));
    }
    next(ErrorFactory.internal('Error al crear el club'));
  }
}

/**
 * Actualiza un club existente en la base de datos.
 * @param req El objeto de solicitud de Express que contiene el ID del club en los parámetros y los datos a actualizar en el cuerpo.
 * @param res El objeto de respuesta de Express para enviar los resultados.
 * @returns Una respuesta HTTP 200 con un mensaje de éxito, o un error HTTP 500 si falla.
 */
async function update(req: Request, res: Response, next: NextFunction) {
  const id = Number.parseInt(req.params.id);
  try {
    const club = await em.findOneOrFail(clubes, { id });
    em.assign(club, req.body);
    await em.flush();
    res.status(200).json({ message: 'club updated', data: club });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
      return next(ErrorFactory.duplicate('Ya existe un club con esa descripción'));
    }
    if (error.name === 'NotFoundError') {
      return next(ErrorFactory.notFound(`Club con ID ${id} no encontrado`));
    }
    next(ErrorFactory.internal('Error al actualizar el club'));
  }
}
/**
 * Elimina un club de la base de datos.
 * @param req El objeto de solicitud de Express que contiene el ID del club en los parámetros.
 * @param res El objeto de respuesta de Express para enviar los resultados.
 * @returns Una respuesta HTTP 200 con un mensaje de éxito, o un error HTTP 500 si falla.
 */
async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number.parseInt(req.params.id);
    const club = em.getReference(clubes, id);
    await em.removeAndFlush(club);
    res.status(200).send({ message: 'club deleted' });
  } catch (error: any) {
    next(ErrorFactory.internal(`Error al eliminar el club`));
  }
}

export { findAll, findOne, add, update, remove };
