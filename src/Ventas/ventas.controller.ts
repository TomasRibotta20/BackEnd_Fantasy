import { Request, Response, NextFunction } from 'express';
import { crearOferta, aceptarOferta, rechazarOferta, cancelarOferta, obtenerOfertasEnviadas, obtenerOfertasRecibidas, obtenerDetalleOferta, procesarOfertasVencidas } from './ventas.service.js';
import { ErrorFactory } from '../shared/errors/errors.factory.js';

export async function crearOfertaController(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.authUser?.user?.userId;
    if (!userId) {
      return next(ErrorFactory.unauthorized('Debes estar autenticado'));
    }

    const { equipoJugador_id, monto_ofertado, mensaje_oferente } = req.body;

    const resultado = await crearOferta(userId, equipoJugador_id, monto_ofertado, mensaje_oferente);

    return res.status(201).json({
      message: resultado.mensaje,
      data: {
        oferta: resultado.oferta,
        presupuesto: resultado.presupuesto
      }
    });
  } catch (error) {
    return next(error);
  }
}

export async function aceptarOfertaController(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.authUser?.user?.userId;
    if (!userId) {
      return next(ErrorFactory.unauthorized('Debes estar autenticado'));
    }

    const ofertaId = parseInt(req.params.ofertaId);
    if (isNaN(ofertaId)) {
      return next(ErrorFactory.validationAppError('ID de oferta inválido'));
    }

    const resultado = await aceptarOferta(userId, ofertaId);

    return res.status(200).json({
      message: resultado.mensaje,
      data: {
        transferencia: resultado.transferencia,
        presupuesto: resultado.presupuesto_vendedor
      }
    });
  } catch (error) {
    return next(error);
  }
}

export async function rechazarOfertaController(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.authUser?.user?.userId;
    if (!userId) {
      return next(ErrorFactory.unauthorized('Debes estar autenticado'));
    }

    const ofertaId = parseInt(req.params.ofertaId);
    if (isNaN(ofertaId)) {
      return next(ErrorFactory.validationAppError('ID de oferta inválido'));
    }

    const { mensaje_respuesta } = req.body;

    const resultado = await rechazarOferta(userId, ofertaId, mensaje_respuesta);

    return res.status(200).json({
      message: resultado.mensaje,
      data: {
        presupuesto_oferente: resultado.presupuesto_oferente
      }
    });
  } catch (error) {
    return next(error);
  }
}

export async function cancelarOfertaController(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.authUser?.user?.userId;
    if (!userId) {
      return next(ErrorFactory.unauthorized('Debes estar autenticado'));
    }

    const ofertaId = parseInt(req.params.ofertaId);
    if (isNaN(ofertaId)) {
      return next(ErrorFactory.validationAppError('ID de oferta inválido'));
    }

    const resultado = await cancelarOferta(userId, ofertaId);

    return res.status(200).json({
      message: resultado.mensaje,
      data: {
        presupuesto: resultado.presupuesto
      }
    });
  } catch (error) {
    return next(error);
  }
}

export async function obtenerOfertasEnviadasController(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.authUser?.user?.userId;
    if (!userId) {
      return next(ErrorFactory.unauthorized('Debes estar autenticado'));
    }

    const { estado, limit, offset } = req.query;

    const resultado = await obtenerOfertasEnviadas(userId, {
      estado: estado as any,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined
    });

    return res.status(200).json({
      message: 'Ofertas enviadas obtenidas exitosamente',
      data: resultado
    });
  } catch (error) {
    return next(error);
  }
}

export async function obtenerOfertasRecibidasController(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.authUser?.user?.userId;
    if (!userId) {
      return next(ErrorFactory.unauthorized('Debes estar autenticado'));
    }

    const { estado, limit, offset } = req.query;

    const resultado = await obtenerOfertasRecibidas(userId, {
      estado: estado as any,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined
    });

    return res.status(200).json({
      message: 'Ofertas recibidas obtenidas exitosamente',
      data: resultado
    });
  } catch (error) {
    return next(error);
  }
}

export async function obtenerDetalleOfertaController(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.authUser?.user?.userId;
    if (!userId) {
      return next(ErrorFactory.unauthorized('Debes estar autenticado'));
    }

    const ofertaId = parseInt(req.params.ofertaId);
    if (isNaN(ofertaId)) {
      return next(ErrorFactory.validationAppError('ID de oferta inválido'));
    }

    const oferta = await obtenerDetalleOferta(userId, ofertaId);

    return res.status(200).json({
      message: 'Detalle de oferta obtenido exitosamente',
      data: oferta
    });
  } catch (error) {
    return next(error);
  }
}

export async function procesarOfertasVencidasController(req: Request, res: Response, next: NextFunction) {
  try {
    // Este endpoint debería ser llamado por un cron job o tener autenticación de admin
    const resultado = await procesarOfertasVencidas();

    return res.status(200).json({
      message: resultado.mensaje,
      data: {
        cantidad: resultado.cantidad
      }
    });
  } catch (error) {
    return next(error);
  }
}