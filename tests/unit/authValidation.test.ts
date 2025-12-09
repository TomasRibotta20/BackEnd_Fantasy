import { describe, it, expect } from '@jest/globals';
import { loginSchema, registerSchema, forgotPasswordSchema, newPasswordSchema } from '../../src/Auth/auth.schema.js';
import { z } from 'zod';

describe('Auth Schemas - Validación de entrada', () => {
  
  /**
   * TESTS DE LOGIN SCHEMA
   */
  describe('loginSchema', () => {
    it('debe validar correctamente un login válido', () => {
      const validLogin = {
        email: 'test@example.com',
        password: 'Password123!'
      };

      const result = loginSchema.safeParse(validLogin);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('test@example.com');
        expect(result.data.password).toBe('Password123!');
      }
    });

    it('debe rechazar un email inválido', () => {
      const invalidLogin = {
        email: 'not-an-email',
        password: 'Password123!'
      };

      const result = loginSchema.safeParse(invalidLogin);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('email');
      }
    });

    it('debe rechazar cuando falta el email', () => {
      const invalidLogin = {
        password: 'Password123!'
      };

      const result = loginSchema.safeParse(invalidLogin);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('email');
      }
    });

    it('debe rechazar cuando falta el password', () => {
      const invalidLogin = {
        email: 'test@example.com'
      };

      const result = loginSchema.safeParse(invalidLogin);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('password');
      }
    });

    it('debe rechazar un password vacío', () => {
      const invalidLogin = {
        email: 'test@example.com',
        password: ''
      };

      const result = loginSchema.safeParse(invalidLogin);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('password');
      }
    });
  });

  /**
   * TESTS DE REGISTER SCHEMA
   */
  describe('registerSchema', () => {
    it('debe validar correctamente un registro válido', () => {
      const validRegister = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'SecurePass123!',
        firstname: 'John',
        lastname: 'Doe'
      };

      const result = registerSchema.safeParse(validRegister);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.username).toBe('testuser');
        expect(result.data.email).toBe('test@example.com');
      }
    });

    it('debe rechazar un username muy corto', () => {
      const invalidRegister = {
        username: 'ab',
        email: 'test@example.com',
        password: 'SecurePass123!',
        firstname: 'John',
        lastname: 'Doe'
      };

      const result = registerSchema.safeParse(invalidRegister);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => issue.path.includes('username'))).toBe(true);
      }
    });

    it('debe rechazar un password que no cumple requisitos de seguridad', () => {
      const invalidRegister = {
        username: 'testuser',
        email: 'test@example.com',
        password: '123', // Muy corto
        firstname: 'John',
        lastname: 'Doe'
      };

      const result = registerSchema.safeParse(invalidRegister);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => issue.path.includes('password'))).toBe(true);
      }
    });

    it('debe rechazar cuando faltan campos requeridos', () => {
      const invalidRegister = {
        username: 'testuser',
        email: 'test@example.com'
        // Falta password, firstname, lastname
      };

      const result = registerSchema.safeParse(invalidRegister);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
      }
    });

    it('debe rechazar un email en formato incorrecto', () => {
      const invalidRegister = {
        username: 'testuser',
        email: 'invalid@email',
        password: 'SecurePass123!',
        firstname: 'John',
        lastname: 'Doe'
      };

      const result = registerSchema.safeParse(invalidRegister);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => issue.path.includes('email'))).toBe(true);
      }
    });
  });

  /**
   * TESTS DE FORGOT PASSWORD SCHEMA
   */
  describe('forgotPasswordSchema', () => {
    it('debe validar correctamente un email válido', () => {
      const validForgot = {
        email: 'recovery@example.com'
      };

      const result = forgotPasswordSchema.safeParse(validForgot);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('recovery@example.com');
      }
    });

    it('debe rechazar un email inválido', () => {
      const invalidForgot = {
        email: 'not-valid-email'
      };

      const result = forgotPasswordSchema.safeParse(invalidForgot);
      expect(result.success).toBe(false);
    });

    it('debe rechazar cuando falta el email', () => {
      const invalidForgot = {};

      const result = forgotPasswordSchema.safeParse(invalidForgot);
      expect(result.success).toBe(false);
    });
  });

  /**
   * TESTS DE NEW PASSWORD SCHEMA
   */
  describe('newPasswordSchema', () => {
    it('debe validar correctamente un password válido', () => {
      const validNewPassword = {
        password: 'NewSecure123!'
      };

      const result = newPasswordSchema.safeParse(validNewPassword);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.password).toBe('NewSecure123!');
      }
    });

    it('debe rechazar un password muy corto', () => {
      const invalidNewPassword = {
        password: 'weak'
      };

      const result = newPasswordSchema.safeParse(invalidNewPassword);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => issue.path.includes('password'))).toBe(true);
      }
    });

    it('debe rechazar un password sin números', () => {
      const invalidNewPassword = {
        password: 'OnlyLetters'
      };

      const result = newPasswordSchema.safeParse(invalidNewPassword);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => issue.path.includes('password'))).toBe(true);
      }
    });

    it('debe rechazar un password sin letras', () => {
      const invalidNewPassword = {
        password: '123456789'
      };

      const result = newPasswordSchema.safeParse(invalidNewPassword);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => issue.path.includes('password'))).toBe(true);
      }
    });

    it('debe rechazar cuando falta el password', () => {
      const invalidNewPassword = {};

      const result = newPasswordSchema.safeParse(invalidNewPassword);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => issue.path.includes('password'))).toBe(true);
      }
    });
  });
});