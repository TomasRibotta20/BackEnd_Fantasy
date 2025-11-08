/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from 'express';
import { Position } from './position.entity.js';
import { orm } from '../shared/db/orm.js';
import { ErrorFactory } from '../shared/errors/errors.factory.js';

const em = orm.em;

/**
 * Recupera todas las posiciones de la base de datos.
 * @param req El objeto de solicitud de Express (no utilizado en este endpoint, pero se mantiene para la firma).
 * @param res El objeto de respuesta de Express para enviar los resultados.
 * @returns Una respuesta HTTP 200 con un mensaje y una lista de posiciones, o un error HTTP 500 si falla.
 */
async function findAll(req: Request, res: Response, next: NextFunction) {
  try {
    const positions = await em.find(Position, {}, { orderBy: { id: 'ASC' } });
    res.status(200).json({ message: 'found all positions', data: positions });
  } catch (error: any) {
    next(ErrorFactory.internal(`Error al obtener las posiciones`));
  }
}

/**
 * Recupera una posición de la base de datos.
 * @param req El objeto de solicitud de Express que contiene el ID de la posición en los parámetros.
 * @param res El objeto de respuesta de Express para enviar los resultados.
 * @returns Una respuesta HTTP 200 con un mensaje y los datos de la posición, o un error HTTP 500 si falla.
 */
async function findOne(req: Request, res: Response, next: NextFunction) {
  const id = Number.parseInt(req.params.id);
  try {
    const position = await em.findOneOrFail(Position, { id });
    res.status(200).json({ message: 'found position', data: position });
  } catch (error: any) {
    if (error.name === 'NotFoundError') {
      return next(ErrorFactory.notFound(`Posición con ID ${id} no encontrada`));
    }
    next(ErrorFactory.internal('Error al obtener la posición'));
  }
}

/**
 * Agrega una nueva posición a la base de datos.
 * @param req El objeto de solicitud de Express que contiene los datos de la posición en el cuerpo.
 * @param res El objeto de respuesta de Express para enviar los resultados.
 * @returns Una respuesta HTTP 201 con un mensaje de éxito y los datos de la posición creada, o un error HTTP 500 si falla.
 */
async function add(req: Request, res: Response, next: NextFunction) {
  try {
    const position = em.create(Position, req.body);
    await em.flush();
    res.status(201).json({ message: 'New position succesfuly created', data: position });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
      return next(ErrorFactory.duplicate('Ya existe una posición con esa descripción'));
    }
    next(ErrorFactory.internal('Error al crear la posición'));
  }
}

/**
 * Actualiza una posición existente en la base de datos.
 * @param req El objeto de solicitud de Express que contiene el ID de la posición en los parámetros y los datos a actualizar en el cuerpo.
 * @param res El objeto de respuesta de Express para enviar los resultados.
 * @returns Una respuesta HTTP 200 con un mensaje de éxito, o un error HTTP 500 si falla.
 */
async function update(req: Request, res: Response, next: NextFunction) {
  const id = Number.parseInt(req.params.id);
  try {
    const positionToUpdate = await em.findOneOrFail(Position, { id });
    em.assign(positionToUpdate, req.body);
    await em.flush();
    res.status(200).json({ message: 'position updated', data: positionToUpdate });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
      return next(ErrorFactory.duplicate('Ya existe una posición con esa descripción'));
    }
    if (error.name === 'NotFoundError') {
      return next(ErrorFactory.notFound(`Posición con ID ${id} no encontrada`));
    }
    next(ErrorFactory.internal('Error al actualizar la posición'));
  }
}

/**
 * Elimina una posición de la base de datos.
 * @param req El objeto de solicitud de Express que contiene el ID de la posición en los parámetros.
 * @param res El objeto de respuesta de Express para enviar los resultados.
 * @returns Una respuesta HTTP 200 con un mensaje de éxito, o un error HTTP 500 si falla.
 */
async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number.parseInt(req.params.id);
    const position = em.getReference(Position, id);
    await em.removeAndFlush(position);
    res.status(200).json({ message: 'position removed' });
  } catch (error: any) {
    next(ErrorFactory.internal(`Error al eliminar la posición: ${error.message}`));
  }
}

export { findAll, findOne, add, update, remove };
