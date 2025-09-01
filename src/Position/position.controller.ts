/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from 'express';
import { Position } from './position.entity.js';
import { orm } from '../shared/db/orm.js';
//import { handleError } from './errors.handler.js';

const em = orm.em;

function sanitizePositionInput(req: Request, res: Response, next: NextFunction) {
  req.body.sanitizedInput = {
    description: req.body.description,
  };
  //more checks here

  Object.keys(req.body.sanitizedInput).forEach((key) => {
    if (req.body.sanitizedInput[key] === undefined) {
      delete req.body.sanitizedInput[key];
    }
  });
  next();
}

/**
 * Recupera todas las posiciones de la base de datos.
 * @param req El objeto de solicitud de Express (no utilizado en este endpoint, pero se mantiene para la firma).
 * @param res El objeto de respuesta de Express para enviar los resultados.
 * @returns Una respuesta HTTP 200 con un mensaje y una lista de posiciones, o un error HTTP 500 si falla.
 */
async function findAll(req: Request, res: Response) {
  try {
    const positions = await em.find(Position, {}, { orderBy: { id: 'ASC' } });
    res.status(200).json({ message: 'found all positions', data: positions });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

/**
 * Recupera una posición de la base de datos.
 * @param req El objeto de solicitud de Express que contiene el ID de la posición en los parámetros.
 * @param res El objeto de respuesta de Express para enviar los resultados.
 * @returns Una respuesta HTTP 200 con un mensaje y los datos de la posición, o un error HTTP 500 si falla.
 */
async function findOne(req: Request, res: Response) {
  try {
    const id = Number.parseInt(req.params.id);
    const position = await em.findOneOrFail(Position, { id });
    res.status(200).json({ message: 'found position', data: position });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

/**
 * Agrega una nueva posición a la base de datos.
 * @param req El objeto de solicitud de Express que contiene los datos de la posición en el cuerpo.
 * @param res El objeto de respuesta de Express para enviar los resultados.
 * @returns Una respuesta HTTP 201 con un mensaje de éxito y los datos de la posición creada, o un error HTTP 500 si falla.
 */
async function add(req: Request, res: Response) {
  try {
    const position = em.create(Position, req.body.sanitizedInput);
    await em.flush();
    res.status(201).json({ message: 'New position succesfuly created', data: position });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

/**
 * Actualiza una posición existente en la base de datos.
 * @param req El objeto de solicitud de Express que contiene el ID de la posición en los parámetros y los datos a actualizar en el cuerpo.
 * @param res El objeto de respuesta de Express para enviar los resultados.
 * @returns Una respuesta HTTP 200 con un mensaje de éxito, o un error HTTP 500 si falla.
 */
async function update(req: Request, res: Response) {
  try {
    const id = Number.parseInt(req.params.id);
    const positionToUpdate = await em.findOneOrFail(Position, { id });
    em.assign(positionToUpdate, req.body.sanitizedInput);
    await em.flush();
    res.status(200).json({ message: 'position updated', data: positionToUpdate });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

/**
 * Elimina una posición de la base de datos.
 * @param req El objeto de solicitud de Express que contiene el ID de la posición en los parámetros.
 * @param res El objeto de respuesta de Express para enviar los resultados.
 * @returns Una respuesta HTTP 200 con un mensaje de éxito, o un error HTTP 500 si falla.
 */
async function remove(req: Request, res: Response) {
  try {
    const id = Number.parseInt(req.params.id);
    const position = em.getReference(Position, id);
    await em.removeAndFlush(position);
    res.status(200).json({ message: 'position removed' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

export { findAll, findOne, add, update, remove, sanitizePositionInput };