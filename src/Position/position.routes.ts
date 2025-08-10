import { Router } from 'express';
import {
  findAll,
  findOne,
  add,
  update,
  remove,
} from './position.controller.js';
import { validate } from '../shared/zod/validate.js';
import { createPositionSchema, updatePositionSchema } from './position.schema.js';

export const positionRouter = Router();

positionRouter.get('/', findAll);
positionRouter.get('/:id', findOne);
positionRouter.post('/', validate(createPositionSchema), add);
positionRouter.put('/:id', validate(updatePositionSchema), update);
positionRouter.patch('/:id', validate(updatePositionSchema), update);
positionRouter.delete('/:id', remove);
