import { Request, Response, NextFunction } from 'express';
import { cambiarAlineacion, crearEquipoConDraft,getEquipoByUserId,intercambiarJugador} from './equipo.service.js';

/**
 * Maneja la petición para crear un nuevo equipo con un draft automático.
 * Extrae el nombre del equipo del body y el ID del usuario autenticado.
 * @param {Request} req - El objeto de solicitud de Express. Espera `nombre` en `req.body`.
 * @param {Response} res - El objeto de respuesta de Express.
 * @param {NextFunction} next - La función para pasar el control al siguiente middleware (manejador de errores).
 * @returns {Promise<Response|void>} Una promesa que se resuelve en una respuesta JSON con el equipo creado o pasa un error a `next`.
 */
export async function crearEquipo(req: Request, res: Response, next: NextFunction) {
  try {
    const { nombre } = req.body;
    // Asumimos que el middleware de autenticación añade el id del usuario a req.auth.id
    // Si lo tienes en otro lado (ej: req.user.id), ajústalo.
    const userId = req.authUser?.user?.userId;

    if (!nombre) {
      return res.status(400).json({ message: 'El nombre del equipo es requerido' });
    }

    if (!userId) {
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    const nuevoEquipo = await crearEquipoConDraft(nombre, userId);

    return res.status(201).json({ message: 'Equipo creado exitosamente', data: nuevoEquipo });
  } catch (error) {
    // El error handler global se encargará de formatear la respuesta
    return next(error);
  }
}
/**
 * Maneja la petición para obtener el equipo del usuario autenticado.
 * @param {Request} req - El objeto de solicitud de Express.
 * @param {Response} res - El objeto de respuesta de Express.
 * @param {NextFunction} next - La función para pasar el control al siguiente middleware.
 * @returns {Promise<Response|void>} Una promesa que se resuelve en una respuesta JSON con los datos del equipo o pasa un error a `next`.
 */
export async function getMiEquipo(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.authUser?.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    const equipo = await getEquipoByUserId(userId);
    return res.status(200).json(equipo);
  } catch (error) {
    return next(error);
  }
}
/**
 * Maneja la petición para intercambiar un jugador del equipo por otro del mercado.
 * @param {Request} req - El objeto de solicitud de Express. Espera `jugadorSaleId` y `jugadorEntraId` en `req.body`.
 * @param {Response} res - El objeto de respuesta de Express.
 * @param {NextFunction} next - La función para pasar el control al siguiente middleware.
 * @returns {Promise<Response|void>} Una promesa que se resuelve en una respuesta JSON de éxito o pasa un error a `next`.
 */
export async function realizarIntercambio(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.authUser?.user?.userId;
    const { jugadorSaleId, jugadorEntraId } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    if (!jugadorSaleId || !jugadorEntraId) {
      return res.status(400).json({ message: 'Se requieren jugadorSaleId y jugadorEntraId' });
    }

    const resultado = await intercambiarJugador(userId, Number(jugadorSaleId), Number(jugadorEntraId));
    return res.status(200).json(resultado);
  } catch (error) {
    return next(error);
  }
}
/**
 * Maneja la petición para cambiar la alineación, moviendo un titular a suplente y viceversa.
 * @param {Request} req - El objeto de solicitud de Express. Espera `jugadorTitularId` y `jugadorSuplenteId` en `req.body`.
 * @param {Response} res - El objeto de respuesta de Express.
 * @param {NextFunction} next - La función para pasar el control al siguiente middleware.
 * @returns {Promise<Response|void>} Una promesa que se resuelve en una respuesta JSON de éxito o pasa un error a `next`.
 */
export async function actualizarAlineacion(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.authUser?.user?.userId;
    const { jugadorTitularId, jugadorSuplenteId } = req.body;

    if (!userId) {
      // Esta validación es redundante si el middleware funciona, pero es segura.
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }
    if (!jugadorTitularId || !jugadorSuplenteId) {
      return res.status(400).json({ message: 'Se requieren jugadorTitularId y jugadorSuplenteId' });
    }

    const resultado = await cambiarAlineacion(userId, Number(jugadorTitularId), Number(jugadorSuplenteId));
    return res.status(200).json(resultado);
  } catch (error) {
    return next(error);
  }
}