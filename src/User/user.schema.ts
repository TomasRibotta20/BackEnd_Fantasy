import { z } from 'zod';

export const createUserSchema = z.object({
  username: z.string()
    .min(3, "El nombre de usuario debe tener al menos 3 caracteres")
    .max(100, "El nombre de usuario no puede tener más de 100 caracteres"),
  email: z.string()
    .min(3, "El email debe tener al menos 3 caracteres")
    .max(100, "El email no puede tener más de 100 caracteres")
    .refine(
      (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
      "Formato de email inválido"
    ),
  password: z.string()
    .min(6, "La contraseña debe tener al menos 6 caracteres")
    .max(100, "La contraseña no puede tener más de 100 caracteres")
    .refine(
      (password) => /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{6,}$/.test(password),
      "La contraseña debe contener al menos una letra y un número"
    ),
  role: z.enum(['user', 'admin']).optional(),
});

export const updateUserSchema = createUserSchema.partial()
  .refine(obj => Object.keys(obj).length > 0, {
    message: 'Se debe enviar al menos un campo para actualizar',
  });

export const idUserParamsSchema = z.object({
  id: z.string().regex(/^[1-9][0-9]*$/, 'El ID debe ser un número válido')
});

export type createUserInput = z.infer<typeof createUserSchema>;
export type updateUserInput = z.infer<typeof updateUserSchema>;
export type idUserParamsInput = z.infer<typeof idUserParamsSchema>;