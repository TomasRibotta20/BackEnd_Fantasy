import { Request, Response, NextFunction } from 'express';
import { crearEquipoConDraft } from './equipo.service.js';

export async function crearEquipo(req: Request, res: Response, next: NextFunction) {
  try {
    const { nombre } = req.body;
    // Asumimos que el middleware de autenticación añade el id del usuario a req.auth.id
    // Si lo tienes en otro lado (ej: req.user.id), ajústalo.
    const userId = req.authUser?.user?.userId;

    if (!nombre) {
      return res.status(400).json({ message: 'El nombre del equipo es requerido' });
    }

    if (!userId) {
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    const nuevoEquipo = await crearEquipoConDraft(nombre, userId);

    return res.status(201).json({ message: 'Equipo creado exitosamente', data: nuevoEquipo });
  } catch (error) {
    // El error handler global se encargará de formatear la respuesta
    return next(error);
  }
}