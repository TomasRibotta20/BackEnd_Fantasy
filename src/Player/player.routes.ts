import Router from 'express';
import {
    findOne,
    findAll,
    update,
    remove,
    add
} from './player.controller.js';
import { validate } from '../shared/zod/validate.js';
import { createPlayerSchema, updatePlayerSchema } from './player.schema.js';

export const playerRouter = Router();

playerRouter.get('/', findAll);
playerRouter.get('/:id', findOne);
playerRouter.post('/', validate(createPlayerSchema), add);
playerRouter.put('/:id', validate(updatePlayerSchema), update);
playerRouter.patch('/:id', validate(updatePlayerSchema), update);
playerRouter.delete('/:id', remove);

