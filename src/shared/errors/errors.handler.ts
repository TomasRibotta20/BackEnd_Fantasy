import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from './errors.factory.js';

export const globalErrorHandler = (error: unknown, req: Request, res: Response, next: NextFunction) => {
  
  // Errores de validación de Zod
  if (error instanceof ZodError) {
    const formattedErrors = error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message
    }));
    return res.status(400).json({
      success: false,
      message: 'Datos inválidos',
      errors: formattedErrors,
      timestamp: new Date().toISOString()
    });
  }
  
  // Errores personalizados de la aplicación
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      type: error.errorType,
      ...(error.details ? { errors: error.details } : {}),
      timestamp: new Date().toISOString()
    });
  }
  
  // Errores no controlados
  console.error('Error inesperado:', error);
  return res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    timestamp: new Date().toISOString()
  });
};