import { Request, Response, NextFunction } from 'express';
import { crearEquipoConDraft } from './equipo.service.js';
import { ErrorFactory } from '../shared/errors/errors.factory.js';

export async function crearEquipo(req: Request, res: Response, next: NextFunction) {
  try {
    const { nombre } = req.body;
    // Asumimos que el middleware de autenticación añade el id del usuario a req.auth.id
    // Si lo tienes en otro lado (ej: req.user.id), ajústalo.
    const userId = req.authUser?.user?.userId;

    if (!userId) {
      return next(ErrorFactory.unauthorized('Usuario no autenticado'));
    }

    const nuevoEquipo = await crearEquipoConDraft(nombre, userId);

    return res.status(201).json({ message: 'Equipo creado exitosamente', data: nuevoEquipo });
  } catch (error) {
    // El error handler global se encargará de formatear la respuesta
    return next(error);
  }
}