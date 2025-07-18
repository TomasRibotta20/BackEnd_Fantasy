import { Router } from 'express';
import { login, logout, register, sanitizeRegisterInput, sanitizeLoginInput, authLimiter } from './auth.controller.js';
//import { requireAuth } from './auth.requires.js';

export const authRouter = Router();

authRouter.post('/login', authLimiter, sanitizeLoginInput, login);
authRouter.post('/logout', logout);
//authRouter.post('/refreshToken', requireAuth, refreshToken);
authRouter.post('/register', authLimiter, sanitizeRegisterInput, register);