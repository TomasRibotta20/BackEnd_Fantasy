import { z } from 'zod';

export const forgotPasswordSchema = z.object({
  email: z.string().min(3).max(100),
});

export const newPasswordSchema = z.object({
  password: z.string()
    .min(6, "La contraseña debe tener al menos 6 caracteres")
    .max(100, "La contraseña no puede tener más de 100 caracteres")
    .refine(
      (password) => /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{6,}$/.test(password),
      "La contraseña debe contener al menos una letra y un número"
    ),
});

export const loginSchema = z.object({
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
});

export const registerSchema = z.object({
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
});

export type forgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type newPasswordInput = z.infer<typeof newPasswordSchema>;
export type loginInput = z.infer<typeof loginSchema>;
export type registerInput = z.infer<typeof registerSchema>; 
