import { Router } from 'express';
import {
  login,
  logout,
  register,
  authLimiter,
  forgotPassword,
  refreshToken,
  createNewPassword,
} from './auth.controller.js';
import { validate } from '../shared/zod/validate.js';
import { forgotPasswordSchema, newPasswordSchema, loginSchema, registerSchema } from './auth.schema.js';
//import { requireAuth } from './auth.requires.js';

export const authRouter = Router();

authRouter.post('/login', authLimiter, validate(loginSchema), login);
authRouter.post('/logout', logout);
authRouter.put('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
authRouter.put('/new-password', validate(newPasswordSchema), createNewPassword);
authRouter.post('/refreshToken', refreshToken);   
authRouter.post('/register', authLimiter, validate(registerSchema), register);
