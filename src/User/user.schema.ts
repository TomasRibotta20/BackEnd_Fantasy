import { z } from 'zod';

export const createUserSchema = z.object({
  username: z.string().min(3).max(100),
  email: z.string().min(3).max(100).regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
  password: z.string().min(6).max(100).regex(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{6,}$/),
  role: z.enum(['user', 'admin']).optional(),
});
//Se puede hacer con .partial?

export const updateUserSchema = createUserSchema.partial()
  .refine(obj => Object.keys(obj).length > 0, {
    message: 'Se debe enviar al menos un campo para actualizar',
  });

export type createUserInput = z.infer<typeof createUserSchema>;
export type updateUserInput = z.infer<typeof updateUserSchema>;