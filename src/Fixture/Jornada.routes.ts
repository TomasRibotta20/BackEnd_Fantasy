import { Router } from 'express';
import { findAll, findOne, add, update, remove } from './Jornada.controller.js';
import { getRankingJornada } from '../Equipo/equipoHistorial.controller.js';
import { validate, validateQuery, validateParams } from '../shared/zod/validate.js';
import { createJornadaSchema, updateJornadaSchema, findAllJornadaQuerySchema, idJornadaParamsSchema } from './jornada.schema.js';

const jornadaRouter = Router();

jornadaRouter.get('/', validateQuery(findAllJornadaQuerySchema), findAll);
jornadaRouter.get('/:id', validateParams(idJornadaParamsSchema), findOne);
jornadaRouter.post('/', validate(createJornadaSchema), add);
jornadaRouter.put('/:id', validateParams(idJornadaParamsSchema), validate(updateJornadaSchema), update);
jornadaRouter.patch('/:id', validateParams(idJornadaParamsSchema), validate(updateJornadaSchema), update);
jornadaRouter.delete('/:id', validateParams(idJornadaParamsSchema), remove);

jornadaRouter.get('/:jornadaId/ranking', getRankingJornada)
export { jornadaRouter };