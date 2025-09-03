import { Request, Response, NextFunction } from 'express';
import { SECRET_JWT_KEY } from '../shared/jwt.js';
import jwt from 'jsonwebtoken';
import { orm } from '../shared/db/orm.js';
import { Users } from '../User/user.entity.js';
import bcrypt from 'bcrypt';
import rateLimit from 'express-rate-limit';

const em = orm.em;

// Rate limiting para auth endpoints
export const authLimiter = rateLimit({
  windowMs: 5 * 1000, //5 segundos (para prubeba) //15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 intentos por IP
  message: { message: 'Demasiados intentos de login. Intenta nuevamente en  5 segundos.' },
  standardHeaders: true,
  legacyHeaders: false,
});
//------------------------------------------------------------------
// Middleware específico para REGISTER
function sanitizeRegisterInput(req: Request, res: Response, next: NextFunction) {
  const { username, email, password, role } = req.body;

  // Validar que todos los campos requeridos estén presentes
  if (!username || !email || !password) {
    return res.status(400).json({
      message: 'Username, email y password son requeridos para registro',
    });
  }

  // Validar tipos
  if (typeof username !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({
      message: 'Todos los campos deben ser texto',
    });
  }

  // Sanitizar y validar username
  const cleanUsername = username.trim(); // Eliminar espacios al inicio y al final
  if (cleanUsername.length < 3 || cleanUsername.length > 20) {
    return res.status(400).json({
      message: 'Username debe tener entre 3 y 20 caracteres',
    });
  }

  if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
    return res.status(400).json({
      message: 'Username solo puede contener letras, números y guiones bajos',
    });
  }

  // Sanitizar y validar email
  const cleanEmail = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    return res.status(400).json({
      message: 'Email no tiene un formato válido',
    });
  }

  // Validar password
  if (password.length < 6) {
    return res.status(400).json({
      message: 'Password debe tener al menos 6 caracteres',
    });
  }

  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    return res.status(400).json({
      message: 'Password debe contener al menos una mayúscula, una minúscula y un número',
    });
  }

  //Ahora la idea es que si el usuario ingresa para un register, entonces el role no lo proporciona, pero si es un admin, entonces puede especificar el role
  // Si no se especifica, por defecto será 'user'
  let assignedRole = 'user'; // Por defecto será 'user'
  
  // Solo permitir especificar role si hay un usuario autenticado y es admin
  if (req.authUser && req.authUser.user && req.authUser.user.role === 'admin' && role) {
    if (role !== 'user' && role !== 'admin') {
      return res.status(400).json({ message: 'Invalid role' });
    }
    assignedRole = role;
  }

  // Guardar datos sanitizados
  req.body.sanitizedInput = {
    username: cleanUsername,
    email: cleanEmail,
    password: password, //No trimear la contraseña aquí, ya que puede ser sensible a espacios
    role: assignedRole,
  };

  next();
}

// Middleware específico para LOGIN
function sanitizeLoginInput(req: Request, res: Response, next: NextFunction) {
  const { email, password } = req.body;

  // Validar que los campos requeridos estén presentes
  if (!email || !password) {
    return res.status(400).json({
      message: 'Email y password son requeridos para login',
    });
  }

  // Validar tipos
  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({
      message: 'Email y password deben ser texto',
    });
  }

  // Sanitizar email (para login es más simple)
  const cleanEmail = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    return res.status(400).json({
      message: 'Email no tiene un formato válido',
    });
  }

  // Para login no validamos la complejidad de la contraseña
  // (puede que sea una contraseña antigua con otras reglas)
  if (password.length === 0) {
    return res.status(400).json({
      message: 'Password no puede estar vacío',
    });
  }

  // Guardar datos sanitizados
  req.body.sanitizedInput = {
    email: cleanEmail,
    password: password,
  };
  next();
}
//------------------------------------------------------------------

async function register(req: Request, res: Response) {
  const { email, password } = req.body.sanitizedInput;
  try {
    // Verificar si el usuario ya existe
    const existingUser = await em.findOne(Users, { email });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });
    const hashedPassword = await bcrypt.hash(password, 10);
    req.body.sanitizedInput.password = hashedPassword;
    //req.body.sanitizedInput.role = 'admin';//-----------------------------------------------------------Solo para pruebas
    const user = em.create(Users, req.body.sanitizedInput);
    await em.flush();
    return res.status(201).json({ message: 'User created successfully', data: user });
  } catch (error) {
    return res.status(500).json({ message: 'Error creating user', error });
  }
}

async function login(req: Request, res: Response) {
  const { email, password } = req.body.sanitizedInput;
  try {
    // Verificar si el usuario ya existe
    const existingUser = await em.findOne(Users, { email });
    if (!existingUser) return res.status(400).json({ message: 'User not found' });
    const isPasswordValid = await bcrypt.compare(password, existingUser.password);
    if (!isPasswordValid) return res.status(400).json({ message: 'Invalid password' });
    const token = jwt.sign(
      { userId: existingUser.id, email: existingUser.email, role: existingUser.role },
      SECRET_JWT_KEY,
      { expiresIn: '1h' }
    );
    const { password: _, ...userWithoutPassword } = existingUser;
    return res
      .cookie('access_token', token, {
        httpOnly: true,
        sameSite: 'strict',
        maxAge: 1000 * 60 * 60,
      })
      .status(200)
      .json({ message: 'Login successful', data: userWithoutPassword }); //Falta activar el secure en producción
  } catch (error) {
    return res.status(500).json({ message: 'Error interno del servidor', error });
  }
}

function logout(req: Request, res: Response) {
  return res.clearCookie('access_token').json({ message: 'Logout successful' });
}

export { login, logout, register, sanitizeLoginInput, sanitizeRegisterInput };
