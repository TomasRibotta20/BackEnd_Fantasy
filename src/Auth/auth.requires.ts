import { Request, Response, NextFunction } from 'express';
import { ErrorFactory } from '../shared/errors/errors.factory.js';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.authUser?.user) {
    return next(ErrorFactory.unauthorized('Acceso denegado - Login requerido'));
  }
  console.log('requireAuth SUCCESS - pasando a controller');
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.authUser?.user) {
    return next(ErrorFactory.unauthorized('Acceso denegado - Login requerido'));
  }

  if (req.authUser.user.role !== 'admin') {
    return next(ErrorFactory.forbidden('Acceso denegado - Se requiere rol de administrador'));
  }
  next();
}
