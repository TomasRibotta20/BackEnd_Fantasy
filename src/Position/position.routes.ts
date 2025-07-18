import { Router } from 'express';
import {
  findAll,
  findOne,
  add,
  update,
  remove,
  sanitizePositionInput,
} from './position.controller.js';
export const positionRouter = Router();

positionRouter.get('/', findAll);
positionRouter.get('/:id', findOne);
positionRouter.post('/', sanitizePositionInput, add);
positionRouter.put('/:id', sanitizePositionInput, update);
positionRouter.patch('/:id', sanitizePositionInput, update);
positionRouter.delete('/:id', remove);
