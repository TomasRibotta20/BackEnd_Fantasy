import { Request, Response, NextFunction } from 'express';
import { crearOferta, aceptarOferta, rechazarOferta, cancelarOferta, obtenerOfertasEnviadas, obtenerOfertasRecibidas, obtenerDetalleOferta, procesarOfertasVencidas } from './ventas.service.js';
import { AppError, ErrorFactory } from '../shared/errors/errors.factory.js';
import { orm } from '../shared/db/orm.js';

export async function crearOfertaController(req: Request, res: Response, next: NextFunction) {
  try {
    const em = orm.em;
    const userId = req.authUser?.user?.userId!;
    const { equipoJugador_id, monto_ofertado, mensaje_oferente } = req.body;
    const resultado = await crearOferta(userId, equipoJugador_id, monto_ofertado, mensaje_oferente, em);
    res.status(201).json({
      message: resultado.mensaje,
      data: {
        oferta: resultado.oferta,
        presupuesto: resultado.presupuesto
      }
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(ErrorFactory.internal('Error interno del servidor al crear la oferta'));
    }
  }
}

export async function aceptarOfertaController(req: Request, res: Response, next: NextFunction) {
  try {
    const em = orm.em;
    const userId = req.authUser?.user?.userId!;
    const ofertaId = Number(req.params.ofertaId);
    const resultado = await aceptarOferta(userId, ofertaId, em);
    res.status(200).json({
      message: resultado.mensaje,
      data: {
        transferencia: resultado.transferencia,
        presupuesto: resultado.presupuesto_vendedor
      }
    });
  } catch (error:any) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(ErrorFactory.internal('Error interno del servidor al aceptar la oferta'));
    }
  }
}

export async function rechazarOfertaController(req: Request, res: Response, next: NextFunction) {
  try {
    const em = orm.em;
    const userId = req.authUser?.user?.userId!;
    const ofertaId = Number(req.params.ofertaId);
    const { mensaje_respuesta } = req.body;
    const resultado = await rechazarOferta(userId, ofertaId, mensaje_respuesta, em);
    res.status(200).json({
      message: resultado.mensaje,
      data: {
        presupuesto_oferente: resultado.presupuesto_oferente
      }
    });
  } catch (error:any) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(ErrorFactory.internal('Error interno del servidor al rechazar la oferta'));
    }
  }
}

export async function cancelarOfertaController(req: Request, res: Response, next: NextFunction) {
  try {
    const em = orm.em;
    const userId = req.authUser?.user?.userId!;
    const ofertaId = Number(req.params.ofertaId);
    const resultado = await cancelarOferta(userId, ofertaId, em);
    res.status(200).json({
      message: resultado.mensaje,
      data: {
        presupuesto: resultado.presupuesto
      }
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(ErrorFactory.internal('Error interno del servidor al cancelar la oferta'));
    }
  }
}

export async function obtenerOfertasEnviadasController(req: Request, res: Response, next: NextFunction) {
  try {
    const em = orm.em;
    const userId = req.authUser?.user?.userId!;
    const { torneoId,estado, limit, offset } = req.query;
    const resultado = await obtenerOfertasEnviadas(userId, parseInt(torneoId as string), {
      estado: estado as any,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined
    }, em);
    res.status(200).json({
      message: 'Ofertas enviadas obtenidas exitosamente',
      data: resultado
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(ErrorFactory.internal('Error interno del servidor al obtener las ofertas enviadas'));
    }
  }
}

export async function obtenerOfertasRecibidasController(req: Request, res: Response, next: NextFunction) {
  try {
    const em = orm.em;
    const userId = req.authUser?.user?.userId!;
    const { torneoId, estado, limit, offset } = req.query;
    const resultado = await obtenerOfertasRecibidas(userId,parseInt(torneoId as string), {
      estado: estado as any,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined
    }, em);
    res.status(200).json({
      message: 'Ofertas recibidas obtenidas exitosamente',
      data: resultado
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(ErrorFactory.internal('Error interno del servidor al obtener las ofertas recibidas'));
    }
  }
}

export async function obtenerDetalleOfertaController(req: Request, res: Response, next: NextFunction) {
  try {
    const em = orm.em;
    const userId = req.authUser?.user?.userId!;
    const ofertaId = Number(req.params.ofertaId);
    const oferta = await obtenerDetalleOferta(userId, ofertaId, em);
    res.status(200).json({
      message: 'Detalle de oferta obtenido exitosamente',
      data: oferta
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(ErrorFactory.internal('Error interno del servidor al obtener el detalle de la oferta'));
    }
  }
}

export async function procesarOfertasVencidasController(req: Request, res: Response, next: NextFunction) {
  try {
    const em = orm.em;
    // Este endpoint debería ser llamado por un cron job o tener autenticación de admin
    const resultado = await procesarOfertasVencidas(em);

    res.status(200).json({
      message: resultado.mensaje,
      data: {
        cantidad: resultado.cantidad
      }
    });
  } catch (error: any) {
     if (error instanceof AppError) {
      next(error);
    } else {
      next(ErrorFactory.internal('Error interno del servidor al procesar ofertas vencidas'));
    }
  }
}