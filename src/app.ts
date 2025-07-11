/* eslint-disable no-console */
import express from 'express';
import { setupSwagger } from './swagger.js'; // agregá el .js por ESM

const app = express();
app.use(express.json());

// tus rutas...
// app.use('/api/jugadores', jugadoresRouter);

setupSwagger(app); // <- aquí inyectamos Swagger

app.listen(3000, () => {
  console.log('Servidor corriendo en http://localhost:3000');
  console.log('Documentación en http://localhost:3000/api-docs');
  console.log('Hola soy una prueba nomas');
});
