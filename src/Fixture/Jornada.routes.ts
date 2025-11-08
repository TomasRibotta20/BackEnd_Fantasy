import { Router } from 'express';
import { findAll, findOne, add, update, remove } from './Jornada.controller.js';
import { validate, validateQuery, validateParams } from '../shared/zod/validate.js';
import { createJornadaSchema, updateJornadaSchema, findAllJornadaQuerySchema, findOneJornadaParamsSchema } from './jornada.schema.js';

const jornadaRouter = Router();

jornadaRouter.get('/', validateQuery(findAllJornadaQuerySchema), findAll);
jornadaRouter.get('/:id', validateParams(findOneJornadaParamsSchema), findOne);
jornadaRouter.post('/', validate(createJornadaSchema), add);
jornadaRouter.put('/:id', validateParams(findOneJornadaParamsSchema), validate(updateJornadaSchema), update);
jornadaRouter.patch('/:id', validateParams(findOneJornadaParamsSchema), validate(updateJornadaSchema), update);
jornadaRouter.delete('/:id', validateParams(findOneJornadaParamsSchema), remove);

export { jornadaRouter };