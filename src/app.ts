import 'dotenv/config';
import express from 'express';
import { setupSwagger } from './swagger.js';
import 'reflect-metadata';
import { clubRouter } from './Club/club.routes.js';
import { playerRouter } from './Player/player.routes.js';
import { jornadaRouter } from './Fixture/Jornada.routes.js';
import { partidoRouter } from './Fixture/Partido.routes.js';
import { positionRouter } from './Position/position.routes.js';
import { orm } from './shared/db/orm.js';
import { RequestContext } from '@mikro-orm/core';
import { userRouter } from './User/user.routes.js';
import { authRouter } from './Auth/auth.routes.js';
import { SECRET_JWT_KEY } from './shared/jwt.js';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import { globalErrorHandler } from './shared/errors/errors.handler.js';
import { ErrorFactory } from './shared/errors/errors.factory.js';

const corsOptions = {
  origin: 'http://localhost:5173',
  credentials: true, //access-control-allow-credentials:true
  optionSuccessStatus: 200,
};

const app = express();
app.use(cors(corsOptions)); // CORS debe ir primero
app.use(express.json()); // Middleware para parsear JSON

app.use((req, res, next) => {
  RequestContext.create(orm.em, next);
});

//middleware
app.use((req, res, next) => {
  console.log(`🌐 ${req.method} ${req.originalUrl}`);
  console.log('🍪 Headers cookie:', req.headers.cookie);
  next();
});
app.use(cookieParser()); // Middleware para manejar cookies
app.use((req, res, next) => {
  const token = req.cookies.access_token;
  console.log('🛤️ req.cookies:', req.cookies);
  req.authUser = { user: null };
  if (!token) { //Si no hay token continúo normalmente
    console.log('🔓 No hay token, continuando...');
    return next();
  }
  try {
    const decoded = jwt.decode(token) as any;
    console.log('📄 Token decodificado:', {
      userId: decoded?.userId,
      username: decoded?.username,
      iat: decoded?.iat,
      exp: decoded?.exp,
      fechaCreacion: new Date(decoded?.iat * 1000),
      fechaExpiracion: new Date(decoded?.exp * 1000),
      fechaActual: new Date(),
      estaExpirado: decoded?.exp < Date.now() / 1000
    });
    const data = jwt.verify(token, SECRET_JWT_KEY);
    if (data && typeof data === 'object' && 'userId' in data) {
      //req.authUser = { user: data };
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
      console.log('🛤️ req.path:', req.path);
      console.log('🛤️ req.originalUrl:', req.originalUrl);
      console.log('🛤️ req.baseUrl:', req.baseUrl);
      const isPublicAuthRoute = req.originalUrl.startsWith('/api/auth');
      console.log('🔓 Es ruta pública?', isPublicAuthRoute);
      if (!isPublicAuthRoute) {
        return next(ErrorFactory.unauthorized('Token expired'));
      }
      res.clearCookie('access_token');
      return next();
    }
    return next();
  }
});

setupSwagger(app); // Configuración de Swagger

app.use('/api/auth', authRouter); // Rutas de autenticación
app.use('/api/users', userRouter); // Rutas de usuarios
app.use('/api/clubs', clubRouter); // Rutas de clubes
app.use('/api/players', playerRouter); // Rutas de jugadores
app.use('/jornadas', jornadaRouter);
app.use('/partidos', partidoRouter);
app.use('/api/positions', positionRouter); // Rutas de posiciones

app.use((req, _, next) => {
  next(ErrorFactory.notFoundRoute(req.originalUrl));
});

app.use(globalErrorHandler);

app.listen(3000, () => {});
//Swagger UI disponible en http://localhost:3000/api-docs
