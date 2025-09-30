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

export const playerRouter = Router();
playerRouter.get('/', requireAuth, getPlayers);
playerRouter.get('/', findAll);
playerRouter.get('/:id', findOne);
playerRouter.post('/', add);
playerRouter.put('/:id', update);
playerRouter.delete('/:id', remove);

