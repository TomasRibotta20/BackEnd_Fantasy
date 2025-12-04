import { Request, Response, NextFunction } from 'express';
import { orm } from '../shared/db/orm.js';
import { HistorialPrecioService } from './historial-precio.service.js';

export class HistorialPrecioController {
  
  /**
   * GET /api/precios/preview/:clubId
   * Obtiene precios sugeridos por IA SIN guardar en BD
   */
  static async previewPreciosPorClub(req: Request, res: Response, next: NextFunction) {
    try {
      const clubId = parseInt(req.params.clubId);
      
      if (isNaN(clubId)) {
        return res.status(400).json({ 
          error: 'ID de club inválido' 
        });
      }

      const em = orm.em.fork();
      const resultado = await HistorialPrecioService.obtenerPreciosSugeridosPorClub(em, clubId);

      res.json({
        success: true,
        mensaje: 'Precios calculados exitosamente (NO guardados en BD)',
        data: resultado
      });

    } catch (error) {
      next(error);
    }
  }

   /**
   * POST /api/precios/calcular/:clubId
   * Calcula Y GUARDA los precios de un club
   */
  static async calcularYGuardarPreciosClub(req: Request, res: Response, next: NextFunction) {
    try {
      const clubId = parseInt(req.params.clubId);
      
      if (isNaN(clubId)) {
        return res.status(400).json({ 
          error: 'ID de club inválido' 
        });
      }

      const em = orm.em.fork();
      const resultado = await HistorialPrecioService.calcularYGuardarPreciosClub(em, clubId);

      res.json({
        success: true,
        mensaje: 'Precios calculados y guardados exitosamente',
        data: resultado
      });

    } catch (error: any) {
      console.error('Error guardando precios:', error);
      next(error);
    }
  }

  /**
   * POST /api/precios/calcular-todos
   * Calcula y guarda precios para TODOS los clubes
   * 
   */
  static async calcularYGuardarTodosLosClubes(req: Request, res: Response, next: NextFunction) {
    try {
      const em = orm.em.fork();
      
      console.log('Iniciando cálculo masivo de precios...');
      
      const resultado = await HistorialPrecioService.calcularYGuardarPreciosTodosLosClubes(em);

      res.json({
        success: true,
        mensaje: 'Proceso completado',
        data: resultado
      });

    } catch (error: any) {
      console.error('Error en cálculo masivo:', error);
      next(error);
    }
  }

   /**
   * POST /api/precios/actualizar-por-rendimiento/:jornadaId
   * Actualiza precios de jugadores según su rendimiento en la jornada
   */
  static async actualizarPreciosPorRendimiento(req: Request, res: Response, next: NextFunction) {
    try {
      const jornadaId = parseInt(req.params.jornadaId);
      
      if (isNaN(jornadaId)) {
        return res.status(400).json({ 
          error: 'ID de jornada invalido' 
        });
      }

      const em = orm.em.fork();
      const resultado = await HistorialPrecioService.actualizarPreciosPorRendimiento(em, jornadaId);

      res.json({
        success: true,
        mensaje: 'Precios actualizados por rendimiento',
        data: resultado
      });

    } catch (error: any) {
      console.error('Error actualizando precios por rendimiento:', error);
      next(error);
    }
  }

}