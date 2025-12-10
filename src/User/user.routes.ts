import { Router } from 'express';
import {
  findAll,
  findOne,
  add,
  update,
  remove,
  getMyProfile,
  updateMyName,
} from './user.controller.js';
import { requireAuth, requireAdmin } from '../Auth/auth.requires.js';
import { validate, validateParams  } from '../shared/zod/validate.js';
import { createUserSchema, updateUserSchema, idUserParamsSchema } from './user.schema.js';

export const userRouter = Router();

userRouter.get('/profile', requireAuth, getMyProfile);
userRouter.put('/profile', requireAuth, validate(updateUserSchema), updateMyName);

userRouter.get('/', requireAdmin, findAll);
userRouter.get('/:id', requireAdmin, validateParams(idUserParamsSchema), findOne);
userRouter.post('/', requireAdmin, validate(createUserSchema), add);
userRouter.put('/:id', requireAdmin, validateParams(idUserParamsSchema), validate(updateUserSchema), update);
userRouter.patch('/:id', requireAdmin, validateParams(idUserParamsSchema), validate(updateUserSchema), update);
userRouter.delete('/:id', requireAdmin, validateParams(idUserParamsSchema), remove);
