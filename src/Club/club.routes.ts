import { Router } from 'express';
import { findAll, findOne, add, update, remove } from './club.controler.js';
import { validate, validateParams } from '../shared/zod/validate.js';
import { createClubSchema, updateClubSchema, idClubParamsSchema } from './club.schema.js';
import { requireAdmin, requireAuth } from '../Auth/auth.requires.js';

export const clubRouter = Router();

clubRouter.get('/', requireAuth, findAll);
clubRouter.get('/:id', requireAuth, validateParams(idClubParamsSchema), findOne);
clubRouter.post('/', requireAdmin, validate(createClubSchema), add);
clubRouter.put('/:id', requireAdmin, validateParams(idClubParamsSchema), validate(updateClubSchema), update);
clubRouter.patch('/:id', requireAdmin, validateParams(idClubParamsSchema), validate(updateClubSchema), update);
clubRouter.delete('/:id', requireAdmin, validateParams(idClubParamsSchema), remove);
