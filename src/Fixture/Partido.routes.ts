import { Router } from 'express';
import { findAll, findOne, add, update, remove } from './Partido.controller.js';
import { validate, validateQuery, validateParams } from '../shared/zod/validate.js';
import { createPartidoSchema, updatePartidoSchema, findAllPartidoQuerySchema, idPartidoParamsSchema } from './partido.schema.js';
import { requireAdmin } from '../Auth/auth.requires.js';

const partidoRouter = Router();

partidoRouter.get('/', requireAdmin, validateQuery(findAllPartidoQuerySchema), findAll);
partidoRouter.get('/:id', requireAdmin, validateParams(idPartidoParamsSchema), findOne);
partidoRouter.post('/', requireAdmin, validate(createPartidoSchema), add);
partidoRouter.put('/:id', requireAdmin, validateParams(idPartidoParamsSchema), validate(updatePartidoSchema), update);
partidoRouter.patch('/:id', requireAdmin, validateParams(idPartidoParamsSchema), validate(updatePartidoSchema), update);
partidoRouter.delete('/:id', requireAdmin, validateParams(idPartidoParamsSchema), remove);

export { partidoRouter };