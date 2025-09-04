import { Router } from 'express';
import {
  findAll,
  findOne,
  add,
  update,
  remove,
  getMyProfile,
  updateMyProfile,
} from './user.controller.js';
import { requireAuth, requireAdmin } from '../Auth/auth.requires.js';
import { validate } from '../shared/zod/validate.js';
import { createUserSchema, updateUserSchema } from './user.schema.js';

export const userRouter = Router();

userRouter.get('/', requireAdmin, findAll); // Listar todos los usuarios (admin)
userRouter.get('/:id', requireAdmin, findOne); // Obtener usuario por ID
userRouter.post('/', requireAdmin, validate(createUserSchema), add); // Crear usuario (admin)
userRouter.put('/:id', requireAdmin, validate(updateUserSchema), update); // Actualizar usuario (admin)
userRouter.patch('/:id', requireAdmin, validate(updateUserSchema), update); // Actualizar usuario (admin)
userRouter.delete('/:id', requireAdmin, remove); // Eliminar usuario (admin)

userRouter.get('/profile', requireAuth, getMyProfile); // Ver mi perfil (publico)
userRouter.put('/profile', requireAuth, updateMyProfile); // Editar mi perfil (publico)
