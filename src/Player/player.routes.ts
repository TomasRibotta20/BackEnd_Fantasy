import Router from 'express';
import { requireAdmin, requireAuth } from '../Auth/auth.requires.js'; 
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
playerRouter.get('/', requireAuth, validateQuery(findAllPlayersQuerySchema), findAll);
playerRouter.get('/:id', requireAuth, validateParams(idPlayerParamsSchema), findOne);
playerRouter.post('/', requireAdmin, validate(createPlayerSchema), add);
playerRouter.put('/:id', requireAdmin, validateParams(idPlayerParamsSchema), validate(updatePlayerSchema), update);
playerRouter.patch('/:id', requireAdmin, validateParams(idPlayerParamsSchema), validate(updatePlayerSchema), update);
playerRouter.delete('/:id', requireAdmin, validateParams(idPlayerParamsSchema), remove);

