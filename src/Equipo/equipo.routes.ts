import { Router } from 'express';
// CAMBIO: Importa el objeto completo, no solo una función.
import { requireAuth } from '../Auth/auth.requires.js';
import { actualizarAlineacion, crearEquipo, getMiEquipo, realizarIntercambio } from './equipo.controller.js';

const equipoRouter = Router();

// Aplicamos el middleware 'auth' para proteger esta ruta.
// Solo usuarios autenticados podrán crear un equipo.
// CAMBIO: Llama al método específico para 'usuario autenticado'.
equipoRouter.post('/', requireAuth, crearEquipo);

// Ruta para obtener el equipo del usuario autenticado
equipoRouter.get('/mi-equipo', requireAuth, getMiEquipo);

equipoRouter.patch('/mi-equipo/intercambio', requireAuth, realizarIntercambio);
equipoRouter.patch('/mi-equipo/alineacion', requireAuth, actualizarAlineacion);

export { equipoRouter };