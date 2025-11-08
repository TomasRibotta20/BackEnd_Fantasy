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

userRouter.get('/profile', requireAuth, getMyProfile); // Ver mi perfil (publico)
userRouter.put('/profile', requireAuth, validate(updateUserSchema), updateMyName); // Editar mi perfil (publico)

userRouter.get('/', requireAdmin, findAll); // Listar todos los usuarios (admin)
userRouter.get('/:id', requireAdmin, validateParams(idUserParamsSchema), findOne); // Obtener usuario por ID
userRouter.post('/', requireAdmin, validate(createUserSchema), add); // Crear usuario (admin)
userRouter.put('/:id', requireAdmin, validateParams(idUserParamsSchema), validate(updateUserSchema), update); // Actualizar usuario (admin)
userRouter.patch('/:id', requireAdmin, validateParams(idUserParamsSchema), validate(updateUserSchema), update); // Actualizar usuario (admin)
userRouter.delete('/:id', requireAdmin, validateParams(idUserParamsSchema), remove); // Eliminar usuario (admin)
