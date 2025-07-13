import { Router } from 'express';
import { findAll, findOne, add, update, remove } from './club.controler.js';

export const clubRouter = Router();

clubRouter.get('/', findAll);
clubRouter.get('/:id', findOne);
clubRouter.post('/', add);
clubRouter.put('/:id', update);
clubRouter.patch('/:id', update);
clubRouter.delete('/:id', remove);
