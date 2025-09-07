import Router from 'express';
import {
    findOne,
    findAll,
    update,
    remove,
    add
} from './player.controller.js';

export const playerRouter = Router();

playerRouter.get('/', findAll);
playerRouter.get('/:id', findOne);
playerRouter.post('/', add);
playerRouter.put('/:id', update);
playerRouter.delete('/:id', remove);

