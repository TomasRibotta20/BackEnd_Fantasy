import { Router } from 'express';
import { findAll, findOne, add, update, remove } from './position.controller.js';
import { validate, validateParams } from '../shared/zod/validate.js';
import { createPositionSchema, updatePositionSchema, idPositionParamsSchema } from './position.schema.js';
import { requireAdmin, requireAuth } from '../Auth/auth.requires.js';

export const positionRouter = Router();

positionRouter.get('/', requireAuth, findAll);
positionRouter.get('/:id', requireAuth, validateParams(idPositionParamsSchema), findOne);
positionRouter.post('/', requireAdmin, validate(createPositionSchema), add);
positionRouter.put('/:id', requireAdmin, validateParams(idPositionParamsSchema), validate(updatePositionSchema), update);
positionRouter.patch('/:id', requireAdmin, validateParams(idPositionParamsSchema), validate(updatePositionSchema), update);
positionRouter.delete('/:id', requireAdmin, validateParams(idPositionParamsSchema), remove);
