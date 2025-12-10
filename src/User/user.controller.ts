/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextFunction, Request, Response } from 'express';
import { Users } from './user.entity.js';
import { orm } from '../shared/db/orm.js';
import bcrypt from 'bcrypt';
import { AppError, ErrorFactory } from '../shared/errors/errors.factory.js';

const em = orm.em;

/**
 * Recupera el perfil del usuario autenticado.
 * @param req El objeto de solicitud de Express (no utilizado en este endpoint, pero se mantiene para la firma).
 * @param res El objeto de respuesta de Express para enviar los resultados.
 * @returns Una respuesta HTTP 200 con un mensaje y los datos del usuario, o un error HTTP 500, 404 si falla.
 */
async function getMyProfile(req: Request, res: Response, next: NextFunction) {
  const { user } = req.authUser;
  try {
    const userFromDb = await em.findOne(Users, { id: user!.userId });
    if (!userFromDb) {
      throw ErrorFactory.notFound('Usuario no encontrado');
    }
    const { password: pwd, resetToken: reset, refreshToken: refresh, ...userWithoutPassword } = userFromDb;
    res.status(200).json({
      message: 'Perfil obtenido exitosamente',
      data: userWithoutPassword,
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(ErrorFactory.internal(`Error obteniendo perfil`));
    }
  }
}
/**
 * Actualiza el nombre de usuario del perfil autenticado.
 * @param req El objeto de solicitud de Express (no utilizado en este endpoint, pero se mantiene para la firma).
 * @param res El objeto de respuesta de Express para enviar los resultados.
 * @returns Una respuesta HTTP 200 con un mensaje y los datos del usuario actualizado, o un error HTTP 500, 404 si falla.
 */
async function updateMyName(req: Request, res: Response, next: NextFunction) {
  const userId = req.authUser.user!.userId;
  const { username } = req.body;
  try {
    const user = await em.findOne(Users, { id: userId });
    if (!user) {
      throw ErrorFactory.notFound('Usuario no encontrado');
    }
    user.username = username;
    await em.flush();
    const { password: pwd, resetToken: reset, refreshToken: refresh, ...userWithoutPassword } = user;
    res.status(200).json({
      message: 'Perfil actualizado exitosamente',
      data: userWithoutPassword,
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(ErrorFactory.internal(`Error actualizando perfil`));
    }
  }
}
/**
 * Recupera todos los usuarios de la base de datos.
 * @param req El objeto de solicitud de Express (no utilizado en este endpoint, pero se mantiene para la firma).
 * @param res El objeto de respuesta de Express para enviar los resultados.
 * @returns Una respuesta HTTP 200 con un mensaje y una lista de usuarios, o un error HTTP 500 si falla.
 */
async function findAll(req: Request, res: Response, next: NextFunction) {
  try {
    const users = await em.find(Users, {}, { orderBy: { id: 'ASC' } });
    res.status(200).json({ message: 'found all users', data: users });
  } catch (error: any) {
    next(ErrorFactory.internal(`Error al obtener los usuarios`));
  }
}
/**
 * Recupera un usuario de la base de datos.
 * @param req El objeto de solicitud de Express que contiene el ID del usuario en los parámetros.
 * @param res El objeto de respuesta de Express para enviar los resultados.
 * @returns Una respuesta HTTP 200 con un mensaje y los datos del usuario, o un error HTTP 500, 404 si falla.
 */
async function findOne(req: Request, res: Response, next: NextFunction) {
  const id = Number.parseInt(req.params.id);
  try {
    const user = await em.findOneOrFail(Users, { id });
    res.status(200).json({ message: 'found user', data: user });
  } catch (error: any) {
    if (error.name === 'NotFoundError') {
      next(ErrorFactory.notFound(`Usuario no encontrado: ${id}`));
    } else {
      next(ErrorFactory.internal(`Error al obtener el usuario`));
    }
  }
}

/**
 * Agrega un nuevo usuario a la base de datos.
 * @param req El objeto de solicitud de Express que contiene los datos del usuario en el cuerpo.
 * @param res El objeto de respuesta de Express para enviar los resultados.
 * @returns Una respuesta HTTP 201 con un mensaje de éxito y los datos del usuario creado, o un error HTTP 500, 409 si falla.
 */
async function add(req: Request, res: Response, next: NextFunction) {
  const { password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  req.body.password = hashedPassword;
  try {
    const user = em.create(Users, req.body);
    await em.flush();
    res.status(201).json({ message: 'User created successfully', data: user });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
      return next(ErrorFactory.duplicate('Ya existe un usuario con ese correo electrónico'));
    }
    next(ErrorFactory.internal('Error al crear el usuario'));
  }
}

/**
 * Actualiza un usuario existente en la base de datos.
 * @param req El objeto de solicitud de Express que contiene el ID del usuario en los parámetros y los datos a actualizar en el cuerpo.
 * @param res El objeto de respuesta de Express para enviar los resultados.
 * @returns Una respuesta HTTP 200 con un mensaje de éxito, o un error HTTP 500, 409, 404 si falla.
 */
async function update(req: Request, res: Response, next: NextFunction) {
  const id = Number.parseInt(req.params.id);
  const { password } = req.body;
  if (password) {
    let hashedPassword;
    try {
      hashedPassword = await bcrypt.hash(password, 10);
    } catch (error: any) {
      return next(ErrorFactory.internal(`Error al hashear la contraseña`));
    }
    req.body.password = hashedPassword;
  }
  try {
    const userToUpdate = await em.findOneOrFail(Users, { id });
    em.assign(userToUpdate, req.body);
    await em.flush();
    res.status(200).json({ message: 'user updated', data: userToUpdate });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
      return next(ErrorFactory.duplicate('Ya existe un usuario con ese correo electrónico'));
    }
    if (error.name === 'NotFoundError') {
      return next(ErrorFactory.notFound(`Usuario con ID ${id} no encontrado`));
    }
    next(ErrorFactory.internal('Error al actualizar el usuario'));
  }
}
/**
 * Elimina un usuario de la base de datos.
 * @param req El objeto de solicitud de Express que contiene el ID del usuario en los parámetros.
 * @param res El objeto de respuesta de Express para enviar los resultados.
 * @returns Una respuesta HTTP 200 con un mensaje de éxito, o un error HTTP 500 si falla.
 */
async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number.parseInt(req.params.id);
    const user = em.getReference(Users, id);
    await em.removeAndFlush(user);
    res.status(200).json({ message: 'user deleted' });
  } catch (error: any) {
    next(ErrorFactory.internal(`Error al eliminar el usuario`));
  }
}

export { findAll, findOne, add, update, remove, getMyProfile, updateMyName };
