import { Request, Response, NextFunction } from 'express';
import { cambiarAlineacion,getEquipoById,intercambiarJugador, venderJugador as venderJugadorService, cambiarEstadoTitularidad} from './equipo.service.js';
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
 * Maneja la petición para obtener el equipo del usuario autenticado.
 * @param {Request} req - El objeto de solicitud de Express.
 * @param {Response} res - El objeto de respuesta de Express.
 * @param {NextFunction} next - La función para pasar el control al siguiente middleware.
 * @returns {Promise<Response|void>} Una promesa que se resuelve en una respuesta JSON con los datos del equipo o pasa un error a next.
 */
export async function getMiEquipo(req: Request, res: Response, next: NextFunction) {
  try {
    const equipoId = Number(req.params.id);
    const userId = req.authUser.user?.userId!;

    const equipo = await getEquipoById(equipoId);
    const ownerId = equipo.torneoUsuario.usuario.id;
    const esMio = ownerId === userId;

    return res.status(200).json({
        data: {
            ...equipo,
            es_mio: esMio
        }
    });

  } catch (error) {
    // El servicio lanza NotFound si el ID no existe
    return next(error);
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
    const userId = req.authUser.user?.userId;
    const equipoId = Number(req.params.id);
    const { jugadorSaleId, jugadorEntraId } = req.body;

    if (!jugadorSaleId || !jugadorEntraId) {
      return next(ErrorFactory.validationAppError('Se requieren jugadorSaleId y jugadorEntraId'));
    }

    const equipo = await em.findOne(Equipo, { id: equipoId }, { 
        populate: ['torneoUsuario.usuario'] 
    });
    if (!equipo) {
        return next(ErrorFactory.notFound('Equipo no encontrado'));
    }
    if (equipo.torneoUsuario.usuario.id !== userId) {
        return next(ErrorFactory.forbidden('No puedes modificar un equipo que no es tuyo.'));
    }

    const resultado = await intercambiarJugador(equipoId, Number(jugadorSaleId), Number(jugadorEntraId));
    return res.status(200).json(resultado);
  } catch (error) {
    return next(ErrorFactory.internal('Error al intercambiar jugadores'));
  }
}

/**
 * Cambia el estado de titularidad de un jugador (titular ↔ suplente)
 */
export async function cambiarEstadoJugador(req: Request, res: Response, next: NextFunction) {
  try {
    const equipoId = Number(req.params.equipoId);
    const { jugadorId } = req.body;
    const userId = req.authUser.user?.userId!;

    if (!jugadorId) {
      throw ErrorFactory.badRequest('El jugadorId es requerido');
    }

    // Verificar permisos
    const equipo = await em.findOne(Equipo, { id: equipoId }, { 
      populate: ['torneoUsuario.usuario'] 
    });

    if (!equipo) {
      throw ErrorFactory.notFound('Equipo no encontrado');
    }

    if (equipo.torneoUsuario.usuario.id !== userId) {
      throw ErrorFactory.forbidden('No puedes modificar un equipo que no es tuyo');
    }

    const resultado = await cambiarEstadoTitularidad(equipoId, jugadorId);

    return res.status(200).json({
      message: resultado.message,
      data: resultado
    });

  } catch (error) {
    return next(error);
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
    const userId = req.authUser.user?.userId;
    const equipoId = Number(req.params.equipoId);
    const { jugadorTitularId, jugadorSuplenteId } = req.body;

    if (!jugadorTitularId || !jugadorSuplenteId) {
      return next(ErrorFactory.validationAppError('Se requieren jugadorTitularId y jugadorSuplenteId'));
    }
    const equipo = await em.findOne(Equipo, { id: equipoId }, { 
        populate: ['torneoUsuario.usuario'] 
    });
    if (!equipo) {
        return next(ErrorFactory.notFound('Equipo no encontrado'));
    }
    if (equipo.torneoUsuario.usuario.id !== userId) {
        return next(ErrorFactory.forbidden('No puedes modificar la alineación de un equipo que no es tuyo.'));
    }
    const resultado = await cambiarAlineacion(equipoId, Number(jugadorTitularId), Number(jugadorSuplenteId));
    return res.status(200).json(resultado);
  } catch (error) {
    return next(ErrorFactory.internal('Error al actualizar la alineación'));
  }
}

/**
 * Vende un jugador del equipo al mercado instantáneamente
 */
export async function venderJugador(req: Request, res: Response, next: NextFunction) {
  try {
    const equipoId = Number(req.params.equipoId);
    const { jugadorId } = req.body;
    const userId = req.authUser.user?.userId!;

    if (!jugadorId) {
      throw ErrorFactory.badRequest('El jugadorId es requerido');
    }

    const resultado = await venderJugadorService(equipoId, jugadorId, userId);

    return res.status(200).json({
      message: 'Jugador vendido exitosamente',
      data: resultado
    });

  } catch (error) {
    return next(error);
  }
}