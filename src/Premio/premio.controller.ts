import e, { Request, Response, NextFunction } from 'express';
import { orm } from '../shared/db/orm.js';
import { Premio, Tier } from './premio.entity.js';
import { Saldo } from './saldo.entity.js';
import { Ruleta } from './ruleta.entity.js';
import { PlayerPick } from './playerpick.entity.js';
import { AppError, ErrorFactory } from '../shared/errors/errors.factory.js';

/**
 * Recupera todos los premios de la base de datos.
 * @param req El objeto de solicitud de Express (no utilizado en este endpoint, pero se mantiene para la firma).
 * @param res El objeto de respuesta de Express para enviar los resultados.
 * @param next La función de middleware de Express para manejar errores.
 * @returns Una respuesta HTTP 200 con un mensaje y una lista de premios, o un error HTTP 500 si falla.
 */
async function findAll(req: Request, res: Response, next: NextFunction) {
  try {
    const em = orm.em;
    const premios = await em.find( Premio, {}, { orderBy: { id: 'ASC' } } );
    res.status(200).json({ message: 'Premios encontrados', data: premios });
  } catch (error: any) {
    next(ErrorFactory.internal('Error al obtener los premios'));
  }
}

/**
 * Recupera todos los premios de un tier específico (oro, plata, bronce).
 * @param req El objeto de solicitud de Express que contiene el tier en los parámetros.
 * @param res El objeto de respuesta de Express para enviar los resultados.
 * @param next La función de middleware de Express para manejar errores.
 * @returns Una respuesta HTTP 200 con un mensaje y una lista de premios del tier especificado, o un error HTTP 500 si falla.
 */
async function findByTier(req: Request, res: Response, next: NextFunction) {
  try {
    const em = orm.em;
    const tier = req.params.tier as Tier;
    const premios = await em.find( Premio, { tier }, { orderBy: { id: 'ASC' } } );
    res.status(200).json({ message: `Premios de tier ${tier} encontrados`, data: premios });
  } catch (error: any) {
    next(ErrorFactory.internal('Error al obtener los premios por tier'));
  }
}

/**
 * Recupera todos los premios de un tipo específico (saldo, ruleta, pick).
 * @param req El objeto de solicitud de Express que contiene el tipo en los parámetros.
 * @param res El objeto de respuesta de Express para enviar los resultados.
 * @param next La función de middleware de Express para manejar errores.
 * @returns Una respuesta HTTP 200 con un mensaje y una lista de premios del tipo especificado, o un error HTTP 400/500 si falla.
 */
async function findByTipo(req: Request, res: Response, next: NextFunction) {
  try {
    const em = orm.em;
    const tipo = req.params.tipo.toUpperCase();
    let premios;

    switch (tipo) {
      case 'SALDO':
        premios = await em.find(Saldo, {}, { orderBy: { id: 'ASC' } });
        break;
      case 'RULETA':
        premios = await em.find(Ruleta, {}, { orderBy: { id: 'ASC' } });
        break;
      case 'PICK':
        premios = await em.find(PlayerPick, {}, { orderBy: { id: 'ASC' } });
        break;
      default:
        throw ErrorFactory.badRequest('Tipo de premio inválido');
    }

    res.status(200).json({ message: `Premios de tipo ${tipo} encontrados`, data: premios });
  } catch (error: any) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(ErrorFactory.internal('Error al obtener los premios por tipo'));
    }
  }
}

/**
 * Recupera un premio específico de la base de datos.
 * @param req El objeto de solicitud de Express que contiene el ID del premio en los parámetros.
 * @param res El objeto de respuesta de Express para enviar los resultados.
 * @param next La función de middleware de Express para manejar errores.
 * @returns Una respuesta HTTP 200 con un mensaje y los datos del premio, o un error HTTP 404/500 si falla.
 */
async function findOne(req: Request, res: Response, next: NextFunction) {
  const id = Number.parseInt(req.params.id);
  try {
    const em = orm.em;
    const premio = await em.findOneOrFail( Premio, { id } );
    res.status(200).json({ message: 'Premio encontrado', data: premio });
  } catch (error: any) {
    if (error.name === 'NotFoundError') {
      return next(ErrorFactory.notFound(`Premio con ID ${id} no encontrado`));
    }
    next(ErrorFactory.internal('Error al obtener el premio'));
  }
}

/**
 * Actualiza un premio existente en la base de datos.
 * Permite actualizar campos comunes (tier, descripcion) y campos específicos según el tipo de premio.
 * @param req El objeto de solicitud de Express que contiene el ID del premio en los parámetros y los datos a actualizar en el cuerpo.
 * @param res El objeto de respuesta de Express para enviar los resultados.
 * @param next La función de middleware de Express para manejar errores.
 * @returns Una respuesta HTTP 200 con un mensaje de éxito y los datos actualizados, o un error HTTP 404/500 si falla.
 */
async function update(req: Request, res: Response, next: NextFunction) {
  const id = Number.parseInt(req.params.id);
  try {
    const em = orm.em;
    const premio = await em.findOneOrFail( Premio, { id } );
    const { tier, descripcion, monto, configuracion } = req.body;

    if (tier) premio.tier = tier;
    if (descripcion) premio.descripcion = descripcion;
    if (premio instanceof Saldo && monto !== undefined) {
      premio.monto = monto;
    }
    if (premio instanceof Ruleta && configuracion) {
      premio.configuracion = configuracion;
    }
    if (premio instanceof PlayerPick && configuracion) {
      premio.configuracion = configuracion;
    }
    await em.flush();
    res.status(200).json({ message: 'Premio actualizado exitosamente', data: premio });
  } catch (error: any) {
    if (error.name === 'NotFoundError') {
      return next(ErrorFactory.notFound(`Premio con ID ${id} no encontrado`));
    }
    next(ErrorFactory.internal('Error al actualizar el premio'));
  }
}

/**
 * Elimina un premio de la base de datos.
 * @param req El objeto de solicitud de Express que contiene el ID del premio en los parámetros.
 * @param res El objeto de respuesta de Express para enviar los resultados.
 * @param next La función de middleware de Express para manejar errores.
 * @returns Una respuesta HTTP 200 con un mensaje de éxito, o un error HTTP 500 si falla.
 */
async function remove(req: Request, res: Response, next: NextFunction) {
  const id = Number.parseInt(req.params.id);
  try {
    const em = orm.em;
    const premio = em.getReference(Premio, id);
    await em.removeAndFlush(premio);
    res.status(200).json({ message: 'Premio eliminado exitosamente' });
  } catch (error: any) {
    next(ErrorFactory.internal('Error al eliminar el premio'));
  }
}

export { findAll, findByTier, findByTipo, findOne, update, remove };