import { Request, Response, NextFunction } from 'express';
import { blindarJugador, ejecutarClausula } from './clausulas.service.js';
import { AppError, ErrorFactory } from '../shared/errors/errors.factory.js';
import { orm } from '../shared/db/orm.js';
/**
 * Controller para blindar un jugador (subir su cláusula)
 */
export async function blindarJugadorController(req: Request, res: Response, next: NextFunction) {
  try {
    const em = orm.em;
    const equipoId = Number(req.params.equipoId);
    const jugadorId = Number(req.params.jugadorId);
    const { monto_incremento } = req.body;
    const userId = req.authUser.user?.userId!;
    const resultado = await blindarJugador(em, equipoId, jugadorId, monto_incremento, userId);
    res.status(200).json({
      success: true,
      message: 'Jugador blindado exitosamente',
      data: resultado
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(ErrorFactory.internal('Error inesperado al blindar jugador'));
    }
  }
}

/**
 * Controller para ejecutar la cláusula de un jugador rival
 */
export async function ejecutarClausulaController(req: Request, res: Response, next: NextFunction) {
  try {
    const em = orm.em;
    const equipoId = Number(req.params.equipoId);
    const jugadorId = Number(req.params.jugadorId);
    const userId = req.authUser.user?.userId!;

    const resultado = await ejecutarClausula(em, equipoId, jugadorId, userId);

    res.status(200).json({
      success: true,
      message: resultado.mensaje,
      data: resultado
    });
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(ErrorFactory.internal('Error inesperado al ejecutar cláusula'));
    }
  }
}