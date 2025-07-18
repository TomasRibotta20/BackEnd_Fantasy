import express from 'express';
import { setupSwagger } from './swagger.js';
import 'reflect-metadata';
import { clubRouter } from './Club/club.routes.js';
import { orm, syncSchema } from './shared/db/orm.js';
import { RequestContext } from '@mikro-orm/core';
import { positionRouter } from './Position/position.routes.js';
import { userRouter } from './User/user.routes.js';
import { authRouter } from './Auth/auth.routes.js';
import { SECRET_JWT_KEY } from './shared/jwt.js';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';

const app = express();
app.use(express.json()); // Middleware para parsear JSON

//middleware
app.use(cookieParser()); // Middleware para manejar cookies
app.use((req, _, next) => {
  const token = req.cookies.access_token;
  req.authUser = { user: null };
  try {
    const data = jwt.verify(token, SECRET_JWT_KEY);
    if (data && typeof data === 'object' && 'userId' in data) {
      //req.authUser = { user: data };
      req.authUser.user = {
        userId: data.userId as number,
        username: data.username as string,
        email: data.email as string,
        role: data.role as string,
        iat: data.iat,
        exp: data.exp
      };
    }
  } catch {}
  next();
});


app.use((req, res, next) => {
  RequestContext.create(orm.em, next);
});
app.use('/api/auth', authRouter); // Rutas de autenticación

setupSwagger(app); // Configuración de Swagger

app.use('/api/users', userRouter); // Rutas de usuarios, incluyendo el registro
app.use('/api/positions', positionRouter);
app.use('/api/clubs', clubRouter); // Rutas de clubes
app.use((_, res) => {
  return res.status(404).send({ message: 'Resource not found' });
});

await syncSchema(); // Sincronizar esquema de la base de datos
app.listen(3000, () => {});
//Swagger UI disponible en http://localhost:3000/api-docs