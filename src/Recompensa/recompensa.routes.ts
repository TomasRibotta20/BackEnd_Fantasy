import { Router } from 'express';
import { requireAuth } from '../Auth/auth.requires.js';
import { getPendientes, getOpcionesRecompensa, elegirPremio, confirmarPick, getPendientesPorTorneo, getHistorialRecompensasPorTorneo } from './recompensa.controller.js';
import { validate, validateParams } from '../shared/zod/validate.js';
import { idRecompensaParamsSchema, elegirPremioSchema, confirmarPickSchema, idTorneoParamsSchema } from './recompensa.schema.js';

export const recompensaRouter = Router();

recompensaRouter.get('/pendientes', requireAuth, getPendientes);
recompensaRouter.get('/pendientes/torneo/:torneoId', requireAuth, validateParams(idTorneoParamsSchema), getPendientesPorTorneo);
recompensaRouter.get('/historial/torneo/:torneoId', requireAuth, validateParams(idTorneoParamsSchema), getHistorialRecompensasPorTorneo);
recompensaRouter.get('/:id/opciones', requireAuth, validateParams(idRecompensaParamsSchema), getOpcionesRecompensa);
recompensaRouter.post('/elegir', requireAuth, validate(elegirPremioSchema), elegirPremio);
recompensaRouter.post('/confirmar-pick', requireAuth, validate(confirmarPickSchema), confirmarPick);
