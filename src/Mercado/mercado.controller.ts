import e, { Request, Response, NextFunction } from 'express';
import {
  inicializarJugadoresTorneo,
  abrirMercado as abrirMercadoService,
  cerrarMercado as cerrarMercadoService,
  obtenerMercadoActivo as obtenerMercadoActivoService
} from './mercado.service.js';
import { ErrorFactory } from '../shared/errors/errors.factory.js';
import { orm } from '../shared/db/orm.js';
import { MercadoDiario } from './mercadoDiario.entity.js';


/**
 * Inicializa los jugadores de un torneo (Admin)
 */
export async function inicializarJugadores(req: Request, res: Response, next: NextFunction) {
  try {
    //Puede que no sirva mas esta funcion. Ya que todo se hace al iniciar un torneo.
    const em = orm.em;
    const { torneoId } = req.body;
    const resultado = await inicializarJugadoresTorneo(em, torneoId);
    await em.flush();
    res.status(200).json({
      message: 'Jugadores inicializados exitosamente',
      data: resultado
    });
  } catch (error: any) {
    if (error instanceof Error) {
      next(error);
    } else {
      next(ErrorFactory.internal('Error desconocido al inicializar jugadores'));
    }
  }
}

/**
 * Abre un nuevo mercado para un torneo (Admin)
 */
export async function abrirMercado(req: Request, res: Response, next: NextFunction) {
  try {
    const { torneoId } = req.body;
    const resultado = await abrirMercadoService(torneoId);
    res.status(201).json({
      message: 'Mercado abierto exitosamente',
      data: resultado
    });
  } catch (error: any) {
    if (error instanceof Error) {
      next(error);
    } else {
      next(ErrorFactory.internal('Error desconocido al abrir mercado'));
    }
  }
}

/**
 * Cierra un mercado y resuelve las pujas (Admin)
 */
export async function cerrarMercado(req: Request, res: Response, next: NextFunction) {
  try {
    const em = orm.em;
    const mercadoId = Number(req.params.mercadoId);
    const mercado = await em.findOne(MercadoDiario, Number(mercadoId));
    if (!mercado) {
      throw ErrorFactory.notFound('Mercado no encontrado');
    }
    const torneoId = mercado.torneo.id;
    if (!torneoId) {
      throw ErrorFactory.badRequest('El torneoId del mercado es inválido');
    }
    const resultado = await cerrarMercadoService(mercadoId);
    let nuevoMercado = null;
    try {
      nuevoMercado = await abrirMercadoService(torneoId);
    } catch (error: any) {
      console.log('No se pudo abrir el siguiente mercado:', error.message);
    }

    res.status(200).json({
      message: 'Mercado cerrado exitosamente',
      mercado_cerrado: resultado.mercado,
      estadisticas: resultado.estadisticas,
      nuevo_mercado: nuevoMercado?.mercado || null
    });
  } catch (error: any) {
    if (error instanceof Error) {
      next(error);
    } else {
      next(ErrorFactory.internal('Error desconocido al cerrar mercado'));
    }
  }
}

/**
 * Obtiene el mercado activo de un torneo
 */
export async function obtenerMercadoActivo(req: Request, res: Response, next: NextFunction) {
  try {
    const em = orm.em;
    const torneoId = Number(req.params.torneoId);
    const userId = req.authUser.user?.userId!;
    const mercado = await obtenerMercadoActivoService(em, torneoId, userId);
    
    if (!mercado) {
      return res.status(200).json({
        message: 'No hay mercado activo en este momento',
        data: null
      });
    }

    res.status(200).json({
      data: mercado
    });
  } catch (error: any) {
    if (error instanceof Error) {
      next(error);
    } else {
      next(ErrorFactory.internal('Error desconocido al obtener mercado activo'));
    }
  }
}