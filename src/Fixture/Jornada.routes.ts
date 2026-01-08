import { Router } from 'express';
import { findAll, findOne, add, update, remove } from './Jornada.controller.js';
import { getRankingTorneoJornada } from '../Equipo/equipoHistorial.controller.js';
import { validate, validateQuery, validateParams } from '../shared/zod/validate.js';
import { createJornadaSchema, updateJornadaSchema, findAllJornadaQuerySchema, idJornadaParamsSchema, rankingJornadaTorneoParamsSchema } from './jornada.schema.js';
import { requireAuth, requireAdmin } from '../Auth/auth.requires.js';
const jornadaRouter = Router();

jornadaRouter.get('/:jornadaId/torneo/:torneoId/ranking', requireAuth/*, validateParams(rankingJornadaTorneoParamsSchema)*/, getRankingTorneoJornada)
jornadaRouter.get('/',requireAuth, validateQuery(findAllJornadaQuerySchema), findAll);
jornadaRouter.get('/:id', requireAuth, validateParams(idJornadaParamsSchema), findOne);
jornadaRouter.post('/', requireAdmin, validate(createJornadaSchema), add);
jornadaRouter.put('/:id', requireAdmin, validateParams(idJornadaParamsSchema), validate(updateJornadaSchema), update);
jornadaRouter.patch('/:id', requireAdmin, validateParams(idJornadaParamsSchema), validate(updateJornadaSchema), update);
jornadaRouter.delete('/:id', requireAdmin, validateParams(idJornadaParamsSchema), remove);

export { jornadaRouter };