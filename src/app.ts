/* eslint-disable no-console */
import express from 'express';
import { setupSwagger } from './swagger.js'; // agregá el .js por ESM
import 'reflect-metadata';
import { clubRouter } from './Club/club.routes.js';
import { orm } from './shared/db/orm.js';
import { RequestContext } from '@mikro-orm/core';

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  RequestContext.create(orm.em, next);
});
// tus rutas...
app.use('/api/clubs', clubRouter);
app.use((_, res) => {
  return res.status(404).send({ message: 'Resource not found' });
});
setupSwagger(app); // <- aquí inyectamos Swagger

app.listen(3000, () => {
  //console.log('Servidor corriendo en http://localhost:3000');
  //console.log('Documentación en http://localhost:3000/api-docs');
  //console.log('Hola soy una prueba nomas');
});
