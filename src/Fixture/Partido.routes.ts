import { Router } from 'express';
import { findAll, findOne, add, update, remove } from './Partido.controller.js';

const partidoRouter = Router();

partidoRouter.get('/', findAll);
partidoRouter.get('/:id', findOne);
partidoRouter.post('/', add);
partidoRouter.put('/:id', update);
partidoRouter.delete('/:id', remove);

export { partidoRouter };