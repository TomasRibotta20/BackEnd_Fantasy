import e, { Request, Response, NextFunction } from 'express';
import {
  ofertar as ofertarService,
  cancelarOferta as cancelarOfertaService,
  obtenerMisOfertas as obtenerMisOfertasService
} from './mercadoPuja.service.js';
import { AppError, ErrorFactory } from '../shared/errors/errors.factory.js';

/**
 * Crea o actualiza una oferta por un jugador del mercado
 */
export async function ofertar(req: Request, res: Response, next: NextFunction) {
  try {
    const equipoId = Number(req.params.equipoId);
    const { itemMercadoId, monto } = req.body;
    const userId = req.authUser.user?.userId!;

    const resultado = await ofertarService(equipoId, itemMercadoId, monto, userId);

    return res.status(200).json({
      message: `Oferta ${resultado.accion} exitosamente`,
      data: resultado
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(ErrorFactory.internal('Error inesperado al crear la oferta'));
    }
  }
}

/**
 * Cancela una oferta antes del cierre del mercado
 */
export async function cancelarOferta(req: Request, res: Response, next: NextFunction) {
  try {
    const pujaId = Number(req.params.pujaId);
    const userId = req.authUser.user?.userId!;

    const resultado = await cancelarOfertaService(pujaId, userId);

    return res.status(200).json(resultado);
  } catch (error: any) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(ErrorFactory.internal('Error inesperado al cancelar la oferta'));
    }
  }
}

/**
 * Obtiene las ofertas activas de un equipo
 */
export async function obtenerMisOfertas(req: Request, res: Response, next: NextFunction) {
  try {
    const equipoId = Number(req.params.equipoId);
    const userId = req.authUser.user?.userId!;

    const ofertas = await obtenerMisOfertasService(equipoId, userId);

    return res.status(200).json({
      data: ofertas
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(ErrorFactory.internal('Error inesperado al obtener las ofertas'));
    }
  }
}