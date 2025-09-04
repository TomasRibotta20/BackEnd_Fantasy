/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextFunction, Request, Response } from 'express';
import { Users } from './user.entity.js';
import { orm } from '../shared/db/orm.js';
import bcrypt from 'bcrypt';
import { ErrorFactory } from '../shared/errors/errors.factory.js';

const em = orm.em;

//------------------------------------------------------------------
async function getMyProfile(req: Request, res: Response) {
  // El middleware requireAuth ya verificó que hay usuario autenticado
  const { user } = req.authUser;
  try {
    // Obtener datos frescos de la BD (por si se actualizó el perfil)
    const userFromDb = await em.findOne(Users, { id: user!.userId });
    if (!userFromDb) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    // No devolver la contraseña
    const { password: _, ...userWithoutPassword } = userFromDb;
    return res.status(200).json({
      message: 'Perfil obtenido exitosamente',
      data: userWithoutPassword,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error obteniendo perfil', error });
  }
}

async function updateMyProfile(req: Request, res: Response) {
  // Usar el ID del usuario autenticado, NO del body
  const userId = req.authUser.user!.userId;
  const { username, email } = req.body; // No necesitas sanitizedInput aquí
  try {
    const user = await em.findOne(Users, { id: userId });
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    // Actualizar solo los campos proporcionados
    if (username) user.username = username;
    if (email) user.email = email;
    await em.flush();
    // No devolver la contraseña
    const { password: _, ...userWithoutPassword } = user;
    return res.status(200).json({
      message: 'Perfil actualizado exitosamente',
      data: userWithoutPassword,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error actualizando perfil', error });
  }
}
//------------------------------------------------------------------

/**
 * Recupera todos los clubes de la base de datos.
 * @param req El objeto de solicitud de Express (no utilizado en este endpoint, pero se mantiene para la firma).
 * @param res El objeto de respuesta de Express para enviar los resultados.
 * @returns Una respuesta HTTP 200 con un mensaje y una lista de usuarios, o un error HTTP 500 si falla.
 */
async function findAll(req: Request, res: Response, next: NextFunction) {
  try {
    const users = await em.find(Users, {}, { orderBy: { id: 'ASC' } });
    res.status(200).json({ message: 'found all users', data: users });
  } catch (error: any) {
    next(ErrorFactory.internal(`Error al obtener los usuarios: ${error.message}`));
  }
}
/**
 * Recupera un usuario de la base de datos.
 * @param req El objeto de solicitud de Express que contiene el ID del usuario en los parámetros.
 * @param res El objeto de respuesta de Express para enviar los resultados.
 * @returns Una respuesta HTTP 200 con un mensaje y los datos del usuario, o un error HTTP 500 si falla.
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
      next(ErrorFactory.internal(`Error al obtener el usuario: ${error.message}`));
    }
  }
}

/**
 * Agrega un nuevo usuario a la base de datos.
 * @param req El objeto de solicitud de Express que contiene los datos del usuario en el cuerpo.
 * @param res El objeto de respuesta de Express para enviar los resultados.
 * @returns Una respuesta HTTP 201 con un mensaje de éxito y los datos del usuario creado, o un error HTTP 500 si falla.
 */
async function add(req: Request, res: Response, next: NextFunction) {
  const { password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  req.body.password = hashedPassword;
  try {
    const user = em.create(Users, req.body);
    await em.flush();
    return res.status(201).json({ message: 'User created successfully', data: user });
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
 * @returns Una respuesta HTTP 200 con un mensaje de éxito, o un error HTTP 500 si falla.
 */
async function update(req: Request, res: Response, next: NextFunction) {
  const id = Number.parseInt(req.params.id);
  const { password } = req.body;
  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, 10);
  } catch (error: any) {
    next(ErrorFactory.internal(`Error al hashear la contraseña: ${error.message}`));
  }
  req.body.password = hashedPassword;
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
    next(ErrorFactory.internal(`Error al eliminar el usuario: ${error.message}`));
  }
}

export { findAll, findOne, add, update, remove, getMyProfile, updateMyProfile };
