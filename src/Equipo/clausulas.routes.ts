// Equipo/clausulas.routes.ts - NUEVO
import { Router } from 'express';
import { requireAuth } from '../Auth/auth.requires.js';
import { blindarJugadorController, ejecutarClausulaController } from './clausulas.controller.js';
import { blindajeSchema, equipoJugadorParamsSchema } from './clausulas.schema.js';
import { verificarModificacionesHabilitadas as verificarModi } from '../shared/middleware/verificarModificaciones.middleware.js';

export const clausulasRouter = Router();

// Blindar jugador (subir cláusula)
clausulasRouter.post(
  '/:equipoId/jugadores/:jugadorId/blindar',
  requireAuth,
  verificarModi,
  blindarJugadorController
);

// Ejecutar cláusula de jugador rival
clausulasRouter.post(
  '/:equipoId/jugadores/:jugadorId/ejecutar-clausula',
  requireAuth,
  verificarModi,
  ejecutarClausulaController
);