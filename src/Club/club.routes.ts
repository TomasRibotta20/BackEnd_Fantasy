import { Router } from 'express';
import { findAll, findOne, add, update, remove } from './club.controler.js';
import { validate } from '../shared/zod/validate.js';
import { createClubSchema, updateClubSchema } from './club.schema.js';

export const clubRouter = Router();

clubRouter.get('/', findAll);
clubRouter.get('/:id', findOne);
clubRouter.post('/', validate(createClubSchema), add);
clubRouter.put('/:id', validate(updateClubSchema), update);
clubRouter.patch('/:id', validate(updateClubSchema), update);
clubRouter.delete('/:id', remove);
