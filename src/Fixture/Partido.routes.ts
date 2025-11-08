import { Router } from 'express';
import { findAll, findOne, add, update, remove } from './Partido.controller.js';
import { validate, validateQuery, validateParams } from '../shared/zod/validate.js';
import { createPartidoSchema, updatePartidoSchema, findAllPartidoQuerySchema, idPartidoParamsSchema } from './partido.schema.js';

const partidoRouter = Router();

partidoRouter.get('/', validateQuery(findAllPartidoQuerySchema), findAll);
partidoRouter.get('/:id', validateParams(idPartidoParamsSchema), findOne);
partidoRouter.post('/', validate(createPartidoSchema), add);
partidoRouter.put('/:id', validateParams(idPartidoParamsSchema), validate(updatePartidoSchema), update);
partidoRouter.patch('/:id', validateParams(idPartidoParamsSchema), validate(updatePartidoSchema), update);
partidoRouter.delete('/:id', validateParams(idPartidoParamsSchema), remove);

export { partidoRouter };