import { z } from 'zod';

export const forgotPasswordSchema = z.object({
  email: z.string().min(3).max(100),
});

export const newPasswordSchema = z.object({
  token: z.string().min(10).max(500),
  password: z.string().min(6).max(100).regex(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{6,}$/),
});

export const loginSchema = z.object({
  email: z.string().min(3).max(100).regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
  password: z.string().min(6).max(100).regex(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{6,}$/),
});

export const registerSchema = z.object({
  username: z.string().min(3).max(100),
  email: z.string().min(3).max(100).regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
  password: z.string().min(6).max(100).regex(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{6,}$/),
  role: z.enum(['user', 'admin']).optional(),
});

export type forgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type newPasswordInput = z.infer<typeof newPasswordSchema>;
export type loginInput = z.infer<typeof loginSchema>;
export type registerInput = z.infer<typeof registerSchema>; 
