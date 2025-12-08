import { Router } from 'express';
import { requireAuth } from '../Auth/auth.requires.js';
import { getPendientes, getOpcionesRecompensa, elegirPremio, confirmarPick } from './recompensa.controller.js';
import { validate, validateParams } from '../shared/zod/validate.js';
import { idRecompensaParamsSchema, elegirPremioSchema, confirmarPickSchema } from './recompensa.schema.js';

export const recompensaRouter = Router();

recompensaRouter.get('/pendientes', requireAuth, getPendientes);
recompensaRouter.get('/:id/opciones', requireAuth, validateParams(idRecompensaParamsSchema), getOpcionesRecompensa);
recompensaRouter.post('/elegir', requireAuth, validate(elegirPremioSchema), elegirPremio);
recompensaRouter.post('/confirmar-pick', requireAuth, validate(confirmarPickSchema), confirmarPick);
