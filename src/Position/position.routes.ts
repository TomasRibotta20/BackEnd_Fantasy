import { Router } from 'express';
import { findAll, findOne, add, update, remove } from './position.controller.js';
import { validate, validateParams } from '../shared/zod/validate.js';
import { createPositionSchema, updatePositionSchema, idPositionParamsSchema } from './position.schema.js';

export const positionRouter = Router();

positionRouter.get('/', findAll);
positionRouter.get('/:id', validateParams(idPositionParamsSchema), findOne);
positionRouter.post('/', validate(createPositionSchema), add);
positionRouter.put('/:id', validateParams(idPositionParamsSchema), validate(updatePositionSchema), update);
positionRouter.patch('/:id', validateParams(idPositionParamsSchema), validate(updatePositionSchema), update);
positionRouter.delete('/:id', validateParams(idPositionParamsSchema), remove);
