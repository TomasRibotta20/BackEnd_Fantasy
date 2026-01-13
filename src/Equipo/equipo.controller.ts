import { Request, Response, NextFunction } from 'express';
import { cambiarAlineacion, getEquipoById, venderJugador as venderJugadorService, cambiarEstadoTitularidad } from './equipo.service.js';
import { AppError, ErrorFactory } from '../shared/errors/errors.factory.js';
import { Equipo } from './equipo.entity.js';
import { orm } from '../shared/db/orm.js';

/**
 * Maneja la petición para obtener todos los equipos.
 * @param {Request} req - El objeto de solicitud de Express.
 * @param {Response} res - El objeto de respuesta de Express.
 * @param {NextFunction} next - La función para pasar el control al siguiente middleware.
 */
export async function obtenerEquipos(req: Request, res: Response, next: NextFunction) {
  try {
    const em = orm.em;
    const equipos = await em.find(Equipo, {}, { orderBy: { id: 'ASC' } });
    res.status(200).json(equipos);
  } catch (error: any) {
    next(ErrorFactory.internal('Error al obtener los equipos'));
  }
}

/**
 * Maneja la petición para obtener el equipo del usuario autenticado.
 * @param {Request} req - El objeto de solicitud de Express.
 * @param {Response} res - El objeto de respuesta de Express.
 * @param {NextFunction} next - La función para pasar el control al siguiente middleware.
 * @returns {Promise<Response|void>} Una promesa que se resuelve en una respuesta JSON con los datos del equipo o pasa un error a next.
 */
export async function getDetalleEquipo(req: Request, res: Response, next: NextFunction) {
  try {
    const em = orm.em;
    const equipoId = Number(req.params.equipoId);
    const userId = req.authUser.user?.userId!;
    const equipo = await getEquipoById(em, equipoId, userId);
    const ownerId = equipo.torneo_usuario.usuario.id;
    const esMio = ownerId === userId;
    res.status(200).json({
        data: {
            ...equipo,
            es_mio: esMio
        }
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(ErrorFactory.internal('Error al obtener el equipo'));
    }
  }
}

/**
 * Cambia el estado de titularidad de un jugador (titular ↔ suplente)
 * @param {Request} req - El objeto de solicitud de Express. Espera jugadorId en req.body.
 * @param {Response} res - El objeto de respuesta de Express.
 * @param {NextFunction} next - La función para pasar el control al siguiente middleware.
 */
export async function cambiarEstadoJugador(req: Request, res: Response, next: NextFunction) {
  try {
    const em = orm.em;
    const equipoId = Number(req.params.equipoId);
    const { jugadorId } = req.body;
    const userId = req.authUser.user?.userId!;

    const equipo = await em.findOne(Equipo, { id: equipoId }, { 
      populate: ['torneo_usuario.usuario', 'torneo_usuario'] 
    });
    if (!equipo) {
      throw ErrorFactory.notFound('Equipo no encontrado');
    }
    if (equipo.torneo_usuario.usuario.id !== userId) {
      throw ErrorFactory.forbidden('No puedes modificar un equipo que no es tuyo');
    }
    const torneoUsuario = equipo.torneo_usuario;
    if (torneoUsuario.expulsado) {
      throw ErrorFactory.forbidden('Equipo expulsado del torneo. No puedes realizar esta acción.');
    }

    const resultado = await cambiarEstadoTitularidad(em, equipoId, jugadorId);
    res.status(200).json({
      message: resultado.message,
      data: resultado
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(ErrorFactory.internal('Error al cambiar el estado de titularidad del jugador'));
    }
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
    const em = orm.em;
    const userId = req.authUser.user?.userId;
    const equipoId = Number(req.params.equipoId);
    const { jugadorTitularId, jugadorSuplenteId } = req.body;

    const equipo = await em.findOne(Equipo, { id: equipoId }, { 
       populate: ['torneo_usuario.usuario', 'torneo_usuario'] 
    });
    if (!equipo) {
      throw ErrorFactory.notFound('Equipo no encontrado');
    }
    if (equipo.torneo_usuario.usuario.id !== userId) {
      throw ErrorFactory.forbidden('No puedes modificar la alineación de un equipo que no es tuyo.');
    }
    const torneoUsuario = equipo.torneo_usuario;
    if (torneoUsuario.expulsado) {
      throw ErrorFactory.forbidden('Equipo expulsado del torneo. No puedes realizar esta acción.');
    }

    const resultado = await cambiarAlineacion(em, equipoId, Number(jugadorTitularId), Number(jugadorSuplenteId));
    res.status(200).json(resultado);
  } catch (error: any) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(ErrorFactory.internal('Error al cambiar la alineación del equipo'));
    }
  }
}

/**
 * Vende un jugador del equipo al mercado instantáneamente
 * @param {Request} req - El objeto de solicitud de Express. Espera jugadorId en req.body.
 * @param {Response} res - El objeto de respuesta de Express.
 * @param {NextFunction} next - La función para pasar el control al siguiente middleware.
 * @returns {Promise<Response|void>} Una promesa que se resuelve en una respuesta JSON de éxito o pasa un error a next.
 */
export async function venderJugador(req: Request, res: Response, next: NextFunction) {
  try {
    const em = orm.em;
    const equipoId = Number(req.params.equipoId);
    const { jugadorId } = req.body;
    const userId = req.authUser.user?.userId!;
    const resultado = await venderJugadorService(em, equipoId, jugadorId, userId);
    res.status(200).json({
      message: 'Jugador vendido exitosamente',
      data: resultado
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(ErrorFactory.internal('Error al vender el jugador'));
    }
  }
}