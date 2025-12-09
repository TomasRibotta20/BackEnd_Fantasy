import { Request, Response, NextFunction } from 'express';
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
    const { torneoId } = req.body;

    if (!torneoId) {
      throw ErrorFactory.badRequest('El torneoId es requerido');
    }

    const resultado = await inicializarJugadoresTorneo(torneoId);

    return res.status(200).json({
      message: 'Jugadores inicializados exitosamente',
      data: resultado
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Abre un nuevo mercado para un torneo (Admin)
 */
export async function abrirMercado(req: Request, res: Response, next: NextFunction) {
  try {
    const { torneoId } = req.body;

    const resultado = await abrirMercadoService(torneoId);

    return res.status(201).json({
      message: 'Mercado abierto exitosamente',
      data: resultado
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Cierra un mercado y resuelve las pujas (Admin)
 */
export async function cerrarMercado(req: Request, res: Response, next: NextFunction) {
  try {
    const mercadoId = Number(req.params.mercadoId);
    //obtenemos el mercado para luego obtener el torneoId y asi abrir el siguiente mercado
    const em = orm.em.fork();
    const mercado = await em.findOne(MercadoDiario, Number(mercadoId));
    
    if (!mercado) {
      throw ErrorFactory.notFound('Mercado no encontrado');
    }

    const torneoId = mercado.torneo.id;

    if (!torneoId) {
      throw ErrorFactory.badRequest('El torneoId del mercado es inválido');
    }
    
    //cerramos el mercado actual
    const resultado = await cerrarMercadoService(mercadoId);

    //abrimos el siguiente mercado
    let nuevoMercado = null;
    try {
      console.log('Abriendo automáticamente el siguiente mercado...');
      nuevoMercado = await abrirMercadoService(torneoId);
      console.log(`✓ Mercado #${nuevoMercado.mercado.numero_mercado} abierto automáticamente`);
    } catch (error: any) {
      console.log('No se pudo abrir el siguiente mercado:', error.message);
    }

    return res.status(200).json({
      message: 'Mercado cerrado exitosamente',
      mercado_cerrado: resultado.mercado,
      estadisticas: resultado.estadisticas,
      nuevo_mercado: nuevoMercado?.mercado || null
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Obtiene el mercado activo de un torneo
 */
export async function obtenerMercadoActivo(req: Request, res: Response, next: NextFunction) {
  try {
    const torneoId = Number(req.params.torneoId);

    const mercado = await obtenerMercadoActivoService(torneoId);

    if (!mercado) {
      return res.status(200).json({
        message: 'No hay mercado activo en este momento',
        data: null
      });
    }

    return res.status(200).json({
      data: mercado
    });
  } catch (error) {
    return next(error);
  }
}