import Router from 'express';
import { requireAuth } from '../Auth/auth.requires.js'; 
import {
    findOne,
    findAll,
    update,
    remove,
    add, 
    getPlayers
} from './player.controller.js';
import { validate, validateParams, validateQuery } from '../shared/zod/validate.js';
import { createPlayerSchema, updatePlayerSchema, findAllPlayersQuerySchema, idPlayerParamsSchema } from './player.schema.js';

export const playerRouter = Router();
playerRouter.get('/', requireAuth, getPlayers);
playerRouter.get('/', validateQuery(findAllPlayersQuerySchema), findAll);
playerRouter.get('/:id', validateParams(idPlayerParamsSchema), findOne);
playerRouter.post('/', validate(createPlayerSchema), add);
playerRouter.put('/:id', validateParams(idPlayerParamsSchema), validate(updatePlayerSchema), update);
playerRouter.patch('/:id', validateParams(idPlayerParamsSchema), validate(updatePlayerSchema), update);
playerRouter.delete('/:id', validateParams(idPlayerParamsSchema), remove);

