/* eslint-disable no-console */
import { Request, Response } from 'express';
import { orm } from '../shared/db/orm.js';
import { Jornada } from './Jornada.entity.js';

const em = orm.em;
/**
 * Recupera todas las jornadas de la base de datos
 * @param req El objeto de solicitud de Express (no utilizado en este endpoint, pero se mantiene para la firma).
 * @param res El objeto de respuesta de Express
 * @returns Una repuesta HTTP 200 con un Json con todas las jornadas o un error HTTP 500 con un mensaje
 */
async function findAll(req: Request, res: Response) {
  try {
    const { temporada, etapa, liga_id } = req.query;
    const where: any = {};
    if (temporada) where.temporada = Number(temporada);
    if (etapa) where.etapa = String(etapa);
    if (liga_id) where.liga_id = Number(liga_id);

    const jornadas = await em.find(Jornada, where, {
      orderBy: { nombre: 'ASC' },
    });

    res.status(200).json({
      message: 'Jornadas obtenidas',
      count: jornadas.length,
      data: jornadas,
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error findAll jornadas:', error);
      res.status(500).json({ message: 'Error obteniendo jornadas', error: error.message });
    } else {
      res.status(500).json({ message: 'Error obteniendo jornadas', error: String(error) });
    }
  }
}

/**
 * Recupera una jornada por su ID
 * @param req El objeto de solicitud de Express que contiene el ID de la jornada en los parámetros
 * @param res El objeto de respuesta de Express
 * @returns Una respuesta HTTP 200 con un Json con la jornada encontrada o un error HTTP 404 si no se encuentra
 */
async function findOne(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    const jornada = await em.findOne(Jornada, { id });
    if (!jornada) return res.status(404).json({ message: 'Jornada no encontrada' });
    res.status(200).json({ message: 'Jornada encontrada', data: jornada });
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: 'Error obteniendo jornada', error: error.message });
    } else {
      res.status(500).json({ message: 'Error obteniendo jornada', error: String(error) });
    }
  }
}

/**
 * Crea una nueva jornada
 * @param req El objeto de solicitud de Express que contiene los datos de la nueva jornada
 * @param res El objeto de respuesta de Express
 * @returns Una respuesta HTTP 201 con un Json con la jornada creada o un error HTTP 500 con un mensaje
 */
async function add(req: Request, res: Response) {
  try {
    const { nombre, temporada, etapa, liga_id, fecha_inicio, fecha_fin } = req.body;
    if (!nombre || temporada == null) {
      return res.status(400).json({ message: 'Faltan campos obligatorios (nombre, temporada)' });
    }
    const exists = await em.findOne(Jornada, { nombre });
    if (exists) {
      return res.status(409).json({ message: 'Ya existe una jornada con ese nombre' });
    }
    const jornada = em.create(Jornada, {
      nombre,
      temporada: Number(temporada),
      etapa: etapa ?? null,
      liga_id: liga_id != null ? Number(liga_id) : null,
      fecha_inicio: fecha_inicio ? new Date(fecha_inicio) : null,
      fecha_fin: fecha_fin ? new Date(fecha_fin) : null,
    });
    await em.persistAndFlush(jornada);
    res.status(201).json({ message: 'Jornada creada', data: jornada });
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: 'Error creando jornada', error: error.message });
    } else {
      res.status(500).json({ message: 'Error creando jornada', error: String(error) });
    }
  }
}

/**
 * Actualiza una jornada existente
 * @param req El objeto de solicitud de Express que contiene el ID de la jornada en los parámetros y los datos actualizados en el cuerpo
 * @param res El objeto de respuesta de Express
 * @returns Una respuesta HTTP 200 con un Json con la jornada actualizada o un error HTTP 404 si no se encuentra
 */
async function update(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    const jornada = await em.findOne(Jornada, { id });
    if (!jornada) return res.status(404).json({ message: 'Jornada no encontrada' });

    const { nombre, temporada, etapa, liga_id, fecha_inicio, fecha_fin } = req.body;

    if (nombre) jornada.nombre = nombre;
    if (temporada != null) jornada.temporada = Number(temporada);
    if (etapa !== undefined) jornada.etapa = etapa ?? null;
    if (liga_id !== undefined) jornada.liga_id = liga_id != null ? Number(liga_id) : null;
    if (fecha_inicio !== undefined) jornada.fecha_inicio = fecha_inicio ? new Date(fecha_inicio) : null;
    if (fecha_fin !== undefined) jornada.fecha_fin = fecha_fin ? new Date(fecha_fin) : null;

    await em.flush();
    res.status(200).json({ message: 'Jornada actualizada', data: jornada });
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: 'Error actualizando jornada', error: error.message });
    } else {
      res.status(500).json({ message: 'Error actualizando jornada', error: String(error) });
    }
  }
}
/**
 * Elimina una jornada existente
 * @param req El objeto de solicitud de Express que contiene el ID de la jornada a eliminar en los parámetros
 * @param res El objeto de respuesta de Express
 * @returns Una respuesta HTTP 200 con un Json con un mensaje de éxito o un error HTTP 404 si no se encuentra
 */
async function remove(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    const jornada = await em.findOne(Jornada, { id });
    if (!jornada) return res.status(404).json({ message: 'Jornada no encontrada' });
    await em.removeAndFlush(jornada);
    res.status(200).json({ message: 'Jornada eliminada' });
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: 'Error eliminando jornada', error: error.message });
    } else {
      res.status(500).json({ message: 'Error eliminando jornada', error: String(error) });
    }
  }
}

export { findAll, findOne, add, update, remove };