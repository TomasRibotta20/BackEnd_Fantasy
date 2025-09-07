import { Router } from 'express';
import { findAll, findOne, add, update, remove } from './Jornada.controller.js';

const jornadaRouter = Router();

jornadaRouter.get('/', findAll);
jornadaRouter.get('/:id', findOne);
jornadaRouter.post('/', add);
jornadaRouter.put('/:id', update);
jornadaRouter.delete('/:id', remove);

export { jornadaRouter };