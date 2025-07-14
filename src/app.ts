import express from 'express';
import { setupSwagger } from './swagger.js';
import 'reflect-metadata';
import { clubRouter } from './Club/club.routes.js';
import { orm } from './shared/db/orm.js';
import { RequestContext } from '@mikro-orm/core';

const app = express();
app.use(express.json()); // Middleware para parsear JSON

app.use((req, res, next) => {
  RequestContext.create(orm.em, next);
});

setupSwagger(app); // Configuración de Swagger

app.use('/api/clubs', clubRouter); // Rutas de clubes
app.use((_, res) => {
  return res.status(404).send({ message: 'Resource not found' });
});

app.listen(3000, () => {});
//Swagger UI disponible en http://localhost:3000/api-docs
