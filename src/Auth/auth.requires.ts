import { Request, Response, NextFunction } from 'express';

// Middleware para verificar autenticación
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.authUser?.user) {
    return res.status(401).json({ message: 'Acceso denegado - Login requerido' });
  }
  next();
}

// Middleware para verificar rol de admin
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.authUser?.user) {
    return res.status(401).json({ message: 'Acceso denegado - Login requerido' });
  }
  
  if (req.authUser.user.role !== 'admin') {
    return res.status(403).json({ message: 'Acceso denegado - Se requiere rol de administrador' });
  }
  
  next();
}