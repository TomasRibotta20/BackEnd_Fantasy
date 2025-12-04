import { Request, Response, NextFunction } from 'express';
import { cambiarAlineacion, crearEquipoConDraft,getEquipoByUserId,intercambiarJugador} from './equipo.service.js';
import { ErrorFactory } from '../shared/errors/errors.factory.js';
import { Equipo } from './equipo.entity.js';
import { orm } from '../shared/db/orm.js';

const em = orm.em;

export async function obtenerEquipos(req: Request, res: Response, next: NextFunction) {
  try {
    const equipos = await em.find(Equipo, {}, { orderBy: { id: 'ASC' } });
    return res.status(200).json(equipos);
  } catch (error) {
    return next(ErrorFactory.internal('Error al obtener los equipos'));
  }
}

/**
 * Maneja la petición para crear un nuevo equipo con un draft automático.
 * Extrae el nombre del equipo del body y el ID del usuario autenticado.
 * @param {Request} req - El objeto de solicitud de Express. Espera nombre en req.body.
 * @param {Response} res - El objeto de respuesta de Express.
 * @param {NextFunction} next - La función para pasar el control al siguiente middleware (manejador de errores).
 * @returns {Promise<Response|void>} Una promesa que se resuelve en una respuesta JSON con el equipo creado o pasa un error a next.
 */
export async function crearEquipo(req: Request, res: Response, next: NextFunction) {
  try {
    const { nombre } = req.body;
    const userId = req.authUser?.user?.userId;

    if (!nombre) {
      return next(ErrorFactory.validationAppError('El nombre del equipo es obligatorio'));
    }

    if (!userId) {
      return next(ErrorFactory.unauthorized('Usuario no autenticado'));
    }

    const nuevoEquipo = await crearEquipoConDraft(nombre, userId);

    return res.status(201).json({ message: 'Equipo creado exitosamente', data: nuevoEquipo });
  } catch (error) {
    // El error handler global se encargará de formatear la respuesta
    return next(ErrorFactory.internal('Error al crear el equipo'));
  }
}

/**
 * Maneja la petición para obtener el equipo del usuario autenticado.
 * @param {Request} req - El objeto de solicitud de Express.
 * @param {Response} res - El objeto de respuesta de Express.
 * @param {NextFunction} next - La función para pasar el control al siguiente middleware.
 * @returns {Promise<Response|void>} Una promesa que se resuelve en una respuesta JSON con los datos del equipo o pasa un error a next.
 */
export async function getMiEquipo(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.authUser?.user?.userId;
    if (!userId) {
      return next(ErrorFactory.unauthorized('Usuario no autenticado'));
    }

    const equipo = await getEquipoByUserId(userId);
    return res.status(200).json(equipo);
  } catch (error) {
    return next(ErrorFactory.internal('Error al obtener el equipo del usuario'));
  }
}
/**
 * Maneja la petición para intercambiar un jugador del equipo por otro del mercado.
 * @param {Request} req - El objeto de solicitud de Express. Espera jugadorSaleId y jugadorEntraId en req.body.
 * @param {Response} res - El objeto de respuesta de Express.
 * @param {NextFunction} next - La función para pasar el control al siguiente middleware.
 * @returns {Promise<Response|void>} Una promesa que se resuelve en una respuesta JSON de éxito o pasa un error a next.
 */
export async function realizarIntercambio(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.authUser?.user?.userId;
    const { jugadorSaleId, jugadorEntraId } = req.body;

    if (!userId) {
      return next(ErrorFactory.unauthorized('Usuario no autenticado'));
    }

    if (!jugadorSaleId || !jugadorEntraId) {
      return next(ErrorFactory.validationAppError('Se requieren jugadorSaleId y jugadorEntraId'));
    }

    const resultado = await intercambiarJugador(userId, Number(jugadorSaleId), Number(jugadorEntraId));
    return res.status(200).json(resultado);
  } catch (error) {
    return next(ErrorFactory.internal('Error al intercambiar jugadores'));
  }
}
/**
 * Maneja la petición para cambiar la alineación, moviendo un titular a suplente y viceversa.
 * @param {Request} req - El objeto de solicitud de Express. Espera jugadorTitularId y jugadorSuplenteId en req.body.
 * @param {Response} res - El objeto de respuesta de Express.
 * @param {NextFunction} next - La función para pasar el control al siguiente middleware.
 * @returns {Promise<Response|void>} Una promesa que se resuelve en una respuesta JSON de éxito o pasa un error a next.
 */
export async function actualizarAlineacion(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.authUser?.user?.userId;
    const { jugadorTitularId, jugadorSuplenteId } = req.body;

    if (!userId) {
      return next(ErrorFactory.unauthorized('Usuario no autenticado'));
    }
    if (!jugadorTitularId || !jugadorSuplenteId) {
      return next(ErrorFactory.validationAppError('Se requieren jugadorTitularId y jugadorSuplenteId'));
    }

    const resultado = await cambiarAlineacion(userId, Number(jugadorTitularId), Number(jugadorSuplenteId));
    return res.status(200).json(resultado);
  } catch (error) {
    return next(ErrorFactory.internal('Error al actualizar la alineación'));
  }
}