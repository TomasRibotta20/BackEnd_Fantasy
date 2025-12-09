import { Request, Response, NextFunction } from 'express';
import { blindarJugador, ejecutarClausula } from './clausulas.service.js';
import { ErrorFactory } from '../shared/errors/errors.factory.js';

/**
 * Controller para blindar un jugador (subir su cláusula)
 */
export async function blindarJugadorController(req: Request, res: Response, next: NextFunction) {
  try {
    const equipoId = parseInt(req.params.equipoId);
    const jugadorId = parseInt(req.params.jugadorId);
    const { monto_incremento } = req.body;

    if (!req.authUser?.user?.userId) {
      return next(ErrorFactory.unauthorized('Usuario no autenticado'));
    }
    const userId = req.authUser.user.userId;

    if (!monto_incremento || monto_incremento <= 0) {
      return next(ErrorFactory.badRequest('El monto de incremento debe ser positivo'));
    }

    const resultado = await blindarJugador(equipoId, jugadorId, monto_incremento, userId);

    res.status(200).json({
      success: true,
      message: 'Jugador blindado exitosamente',
      data: resultado
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller para ejecutar la cláusula de un jugador rival
 */
export async function ejecutarClausulaController(req: Request, res: Response, next: NextFunction) {
  try {
    const equipoId = parseInt(req.params.equipoId);
    const jugadorId = parseInt(req.params.jugadorId);
    if (!req.authUser?.user?.userId) {
      return next(ErrorFactory.unauthorized('Usuario no autenticado'));
    }
    
    const userId = req.authUser.user.userId;

    const resultado = await ejecutarClausula(equipoId, jugadorId, userId);

    res.status(200).json({
      success: true,
      message: resultado.mensaje,
      data: resultado
    });
  } catch (error) {
    next(error);
  }
}