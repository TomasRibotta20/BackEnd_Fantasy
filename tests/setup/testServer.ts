// tests/setup/testServer.ts
import express, { Application } from 'express';
import { MikroORM, RequestContext } from '@mikro-orm/core';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { SECRET_JWT_KEY } from '../../src/shared/jwt.js';
import { authRouter } from '../../src/Auth/auth.routes.js';
import { torneoRouter } from '../../src/Torneo/torneo.routes.js';
import { equipoRouter } from '../../src/Equipo/equipo.routes.js';
import { globalErrorHandler } from '../../src/shared/errors/errors.handler.js';
import { ErrorFactory } from '../../src/shared/errors/errors.factory.js';

/**
 * Crea una aplicación Express para tests con las rutas necesarias
 */
export function createTestApp(orm: MikroORM): Application {
  const app = express();
  
  app.use(express.json());
  app.use(cookieParser());
  
  // Middleware para RequestContext
  app.use((req, res, next) => {
    RequestContext.create(orm.em, next);
  });
  
  // Middleware de autenticación JWT (igual que en app.ts)
  app.use((req, res, next) => {
    const token = req.cookies.access_token;
    req.authUser = { user: null };
    
    if (!token) {
      return next();
    }
    
    try {
      const data = jwt.verify(token, SECRET_JWT_KEY);
      if (data && typeof data === 'object' && 'userId' in data) {
        req.authUser.user = {
          userId: data.userId as number,
          username: data.username as string,
          email: data.email as string,
          role: data.role as string,
          iat: data.iat,
          exp: data.exp,
        };
      }
      return next();
    } catch (error: any) {
      req.authUser = { user: null };
      if (error.name === 'TokenExpiredError') {
        const isPublicAuthRoute = req.originalUrl.startsWith('/api/auth');
        if (!isPublicAuthRoute) {
          return next(ErrorFactory.unauthorized('Token expired'));
        }
      }
      return next();
    }
  });
  
  // Rutas
  app.use('/api/auth', authRouter);
  app.use('/api/torneo', torneoRouter);
  app.use('/api/equipo', equipoRouter);
  
  // Manejador de errores
  app.use(globalErrorHandler);
  
  return app;
}