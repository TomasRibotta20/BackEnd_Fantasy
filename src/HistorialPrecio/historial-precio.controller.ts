import { Request, Response, NextFunction } from 'express';
import { orm } from '../shared/db/orm.js';
import { HistorialPrecioService } from './historial-precio.service.js';
import { AppError, ErrorFactory } from '../shared/errors/errors.factory.js';

export class HistorialPrecioController {
  
  /**
   * GET /api/precios/preview/:clubId
   * Obtiene precios sugeridos por IA SIN guardar en BD
   */
  static async previewPreciosPorClub(req: Request, res: Response, next: NextFunction) {
    try {
      const em = orm.em
      const clubId = Number(req.params.clubId);
      const resultado = await HistorialPrecioService.obtenerPreciosSugeridosPorClub(em, clubId);

      res.json({
        success: true,
        mensaje: 'Precios calculados exitosamente (NO guardados en BD)',
        data: resultado
      });

    } catch (error: any) {
      if (error instanceof AppError) {
        next(error);
      } else {
        next(ErrorFactory.internal('Error obteniendo preview de precios'));
      }
    }
  }

   /**
   * POST /api/precios/calcular/:clubId
   * Calcula Y GUARDA los precios de un club
   */
  static async calcularYGuardarPreciosClub(req: Request, res: Response, next: NextFunction) {
    try {
      const em = orm.em
      const clubId = Number(req.params.clubId);
      const resultado = await HistorialPrecioService.calcularYGuardarPreciosClub(em, clubId);

      res.json({
        success: true,
        mensaje: 'Precios calculados y guardados exitosamente',
        data: resultado
      });

    } catch (error: any) {
      if (error instanceof AppError) {
        next(error);
      } else {
        next(ErrorFactory.internal('Error calculando y guardando precios del club'));
      }
    }
  }

  /**
   * POST /api/precios/calcular-todos
   * Calcula y guarda precios para TODOS los clubes
   * 
   */
  static async calcularYGuardarTodosLosClubes(req: Request, res: Response, next: NextFunction) {
    try {
      const em = orm.em
      const resultado = await HistorialPrecioService.calcularYGuardarPreciosTodosLosClubes(em);
      res.json({
        success: true,
        mensaje: 'Proceso completado',
        data: resultado
      });

    } catch (error: any) {
      if (error instanceof AppError) {
        next(error);
      } else {
        next(ErrorFactory.internal('Error calculando y guardando precios de todos los clubes'));
      }
    }
  }

   /**
   * POST /api/precios/actualizar-por-rendimiento/:jornadaId
   * Actualiza precios de jugadores según su rendimiento en la jornada
   */
  static async actualizarPreciosPorRendimiento(req: Request, res: Response, next: NextFunction) {
    try {
      const em = orm.em
      const jornadaId = Number(req.params.jornadaId);
      const resultado = await HistorialPrecioService.actualizarPreciosPorRendimiento(em, jornadaId);

      res.json({
        success: true,
        mensaje: 'Precios actualizados por rendimiento',
        data: resultado
      });

    } catch (error: any) {
      if (error instanceof AppError) {
        next(error);
      } else {
        next(ErrorFactory.internal('Error actualizando precios por rendimiento'));
      }
    }
  }
}