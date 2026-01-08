import { Request, Response, NextFunction } from 'express';
import { SECRET_JWT_KEY, SECRET_RESETJWT_KEY, SECRET_REFRESHJWT_KEY } from '../shared/jwt.js';
import jwt from 'jsonwebtoken';
import { orm } from '../shared/db/orm.js';
import { Users } from '../User/user.entity.js';
import bcrypt from 'bcrypt';
import rateLimit from 'express-rate-limit';
import { AppError, ErrorFactory } from '../shared/errors/errors.factory.js';
import { transporter } from '../shared/mailer/mailer.js';

const em = orm.em;

export const authLimiter = rateLimit({
  windowMs: 5 * 1000,
  max: 5,
  message: { message: 'Demasiados intentos de login. Intenta nuevamente en  5 segundos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

async function register(req: Request, res: Response, next: NextFunction) {
  const { email, password } = req.body;
  try {

    const existingUser = await em.findOne(Users, { email });
    if (existingUser) throw ErrorFactory.duplicate('User already exists');

    const hashedPassword = await bcrypt.hash(password, 10);
    req.body.password = hashedPassword;
    const user = em.create(Users, req.body);
    await em.flush();
    const userWithoutPassword = {
      id: user.id,
      username: user.username,
      email: user.email,
      rol: user.rol,
      resetToken: user.resetToken
    };
    res.status(201).json({ message: 'User created successfully', data: userWithoutPassword });
  } catch (error: any) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(ErrorFactory.internal('Error creating user'));
    }
  }
}

async function login(req: Request, res: Response, next: NextFunction) {
  const { email, password } = req.body;
  try {
    const existingUser = await em.findOne(Users, { email });
    if (!existingUser) throw ErrorFactory.notFound('User not found');

    const isPasswordValid = await bcrypt.compare(password, existingUser.password);
    if (!isPasswordValid) throw ErrorFactory.validationAppError('Invalid password');

    const accessToken = jwt.sign(
      { userId: existingUser.id, username: existingUser.username, email: existingUser.email, role: existingUser.rol, type: 'access' },
      SECRET_JWT_KEY,
      { expiresIn: '10m' }
    );
    const refreshToken = jwt.sign(
      { userId: existingUser.id, username: existingUser.username, email: existingUser.email, role: existingUser.rol, type: 'refresh' },
      SECRET_REFRESHJWT_KEY,
      { expiresIn: '7d' }
    );

    existingUser.refreshToken = await bcrypt.hash(refreshToken, 10);
    await em.flush();
    const userWithoutPassword = {
      id: existingUser.id,
      username: existingUser.username,
      email: existingUser.email,
      rol: existingUser.rol,
      resetToken: existingUser.resetToken
    };
    res
      .cookie('access_token', accessToken, {
        httpOnly: true,
        sameSite: 'strict',
        //maxAge: 1000 * 60 * 2, // 2 minutos
      })
      .cookie('refresh_token', refreshToken, {
        httpOnly: true,
        sameSite: 'strict',
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 días
        path: '/api/auth',
      })
      .status(200)
      .json({ message: 'Login successful', data: userWithoutPassword }); //Falta activar el secure en producción
  } catch (error: any) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(ErrorFactory.internal('Error interno del servidor'));
    }
  }
}

async function logout(req: Request, res: Response) {
  const refreshToken = req.cookies.refresh_token;
  if (refreshToken) {
    try {
      const payload = jwt.verify(refreshToken, SECRET_REFRESHJWT_KEY) as any;
      const user = await em.findOne(Users, { id: payload.userId });
      if (user) {
        user.refreshToken = undefined;
        await em.flush();
      }
    } catch (error: any) {
    }
  }
  return res.clearCookie('access_token', { httpOnly: true, sameSite: 'strict' }).clearCookie('refresh_token', { httpOnly: true, sameSite: 'strict', path: '/api/auth' }).json({ message: 'Logout successful' });
}

async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  const { email } = req.body;
  const message = 'Si el email existe, recibirás un enlace de recuperación';
  let existingUser;
  try {
    existingUser = await em.findOne(Users, { email });
  } catch (error: any) {
    return next(ErrorFactory.internal('Error accediendo a la base de datos'));
  }
  if (!existingUser) {
    return res.status(200).json({ message });
  }
  let resetToken;
  try {
    resetToken = jwt.sign({ userId: existingUser.id, email: existingUser.email, type: 'password_reset' }, SECRET_RESETJWT_KEY, { expiresIn: '10m' });
  } catch (error: any) {
    return next(ErrorFactory.internal('Error interno del servidor'));
  }
  let hashedToken;
  try {
    hashedToken = await bcrypt.hash(resetToken, 10);
  } catch (error: any) {
    return next(ErrorFactory.internal('Error interno del servidor'));
  }
  existingUser.resetToken = hashedToken;
  const verificationLink = `https://localhost:5173/new-password/${resetToken}`;
  const mailOptions = {
    from: '"Forgot password" <arielmazalan15@gmail.com>',
    to: existingUser.email,
    subject: 'Restablecer contraseña',
    html: `
      <h2>Restablecer contraseña</h2>
      <p>Haz clic en el siguiente enlace para restablecer tu contraseña:</p>
      <a href="${verificationLink}">Restablecer contraseña</a>
      <p>Este enlace expira en 15 minutos.</p>
      <p>Si no solicitaste este cambio, ignora este email.</p>
    `,
  }
  ////////////////////////////////////////////////////////////////////////////
  if (!process.env.GMAIL_PASS) {
    console.log("⚠️ Falta configuración de correo. Usando modo demo.");
    console.log("📧 Email que se habría enviado:");
    console.log(mailOptions);
    console.log("🔗 Link de reset:", verificationLink);
  } else {
    try {
      await transporter.sendMail(mailOptions);
    } catch (error: any) {
      return next(ErrorFactory.internal('Error interno del servidor'));
  }
  }
  ////////////////////////////////////////////////////////////////////////////
  try {
    await em.flush();
  } catch (error: any) {
    return next(ErrorFactory.internal('Error interno del servidor'));
  }
  return res.status(200).json({ message });
}

async function createNewPassword(req: Request, res: Response, next: NextFunction) {
  const { password } = req.body;
  const resetToken = req.params.resetToken as string;
  if (!resetToken) {
    return next(ErrorFactory.unauthorized('Unauthorized'));
  }
  let jwtPayLoad;
  let user;
  try {
    jwtPayLoad = jwt.verify(resetToken, SECRET_RESETJWT_KEY);
    if (!jwtPayLoad || typeof jwtPayLoad === 'string' || jwtPayLoad.type !== 'password_reset') {
      throw ErrorFactory.internal('Token inválido');
    }
    user = await em.findOne(Users, { id: jwtPayLoad.userId });
  } catch (error: any) {
    if (error instanceof AppError) {
      return next(error);
    }
    return next(ErrorFactory.unauthorized('Token inválido o expirado'));
  }
  if (!user || !user.resetToken) {
    return next(ErrorFactory.unauthorized('Token inválido o expirado'));
  }
  const isTokenValid = await bcrypt.compare(resetToken, user.resetToken);
  if (!isTokenValid) {
    return next(ErrorFactory.unauthorized('Token inválido o expirado'));
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  user.password = hashedPassword;
  user.resetToken = null;
  try {
    await em.flush();
    return res.status(200).json({ message: 'Contraseña actualizada exitosamente' });
  } catch (error: any) {
    return next(ErrorFactory.internal('Error interno del servidor'));
  }
}

async function refreshToken(req: Request, res: Response, next: NextFunction) {
  const refreshToken = req.cookies.refresh_token;
  if (!refreshToken) {
    return next(ErrorFactory.validationAppError('No refresh token provided'));
  }
  let payload;
  try {
    payload = jwt.verify(refreshToken, SECRET_REFRESHJWT_KEY);
    if (!payload || typeof payload === 'string' || payload.type !== 'refresh') {
      throw ErrorFactory.unauthorized('Invalid refresh token format');
    }
  } catch (error: any) {
    if (error instanceof AppError) {
      return next(error);
    }
    return next(ErrorFactory.unauthorized('Invalid or expired refresh token'));
  }
  let existingUser;
  try {
    const { email } = payload;
    existingUser = await em.findOne(Users, { email });
  } catch (error: any) {
    return next(ErrorFactory.internal('Error interno del servidor'));
  }
  if (!existingUser) {
    return next(ErrorFactory.notFound('Usuario no encontrado'));
  }
  if (!existingUser.refreshToken) {
    return next(ErrorFactory.unauthorized('Refresh token no encontrado'));
  }

  let isRefreshTokenValid;
  try {
    isRefreshTokenValid = await bcrypt.compare(refreshToken, existingUser.refreshToken);
  } catch (error: any) {
    return next(ErrorFactory.internal('Error validando refresh token'));
  }
  if (!isRefreshTokenValid) {
    return next(ErrorFactory.unauthorized('Refresh token inválido'));
  }
  const newAccessToken = jwt.sign(
    { userId: payload.userId, username: payload.username, email: payload.email, role: payload.role, type: 'access' },
    SECRET_JWT_KEY,
    { expiresIn: '10m' }
  );
  const newRefreshToken = jwt.sign(
    { userId: payload.userId, username: payload.username, email: payload.email, role: payload.role, type: 'refresh' },
    SECRET_REFRESHJWT_KEY,
    { expiresIn: '7d' }
  );
  const hashedNewRefreshToken = await bcrypt.hash(newRefreshToken, 10);
  existingUser.refreshToken = hashedNewRefreshToken;
  try {
    await em.flush();
  } catch (error: any) {
    return next(ErrorFactory.internal('Error interno del servidor'));
  }
  return res
    .cookie('access_token', newAccessToken, {
      httpOnly: true,
      sameSite: 'strict',
      //maxAge: 1000 * 60 * 2, // 2 minutos
    })
    .cookie('refresh_token', newRefreshToken, {
      httpOnly: true,
      sameSite: 'strict',
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 días
      path: '/api/auth',
    })
    .status(200)
    .json({ message: 'Tokens refreshed exitosamente' });
}

export { login, logout, register, forgotPassword, createNewPassword, refreshToken };
