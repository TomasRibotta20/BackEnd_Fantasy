import { Router } from 'express';
import { findAll, findOne, add, update, remove } from './club.controler.js';
import { validate, validateParams } from '../shared/zod/validate.js';
import { createClubSchema, updateClubSchema, idClubParamsSchema } from './club.schema.js';

export const clubRouter = Router();

clubRouter.get('/', findAll);
clubRouter.get('/:id', validateParams(idClubParamsSchema), findOne);
clubRouter.post('/', validate(createClubSchema), add);
clubRouter.put('/:id', validateParams(idClubParamsSchema), validate(updateClubSchema), update);
clubRouter.patch('/:id', validateParams(idClubParamsSchema), validate(updateClubSchema), update);
clubRouter.delete('/:id', validateParams(idClubParamsSchema), remove);
