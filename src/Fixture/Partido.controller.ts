/* eslint-disable no-console */
import { Request, Response } from 'express';
import { orm } from '../shared/db/orm.js';
import { Partido } from './partido.entity.js';
import { Jornada } from './Jornada.entity.js';
import { clubes } from '../Club/club.entity.js';

const em = orm.em;
/**
 * Recupera todos los partidos de la base de datos
 * @param req El objeto de solicitud de Express (no utilizado en este endpoint, pero se mantiene para la firma).
 * @param res El objeto de respuesta de Express
 * @returns Una respuesta HTTP 200 con un Json con todos los partidos o un error HTTP 500 con un mensaje
 */
async function findAll(req: Request, res: Response) {
  try {
    const { jornadaId, clubId, from, to } = req.query;
    const where: any = {};
    if (jornadaId) where.jornada = Number(jornadaId);
    if (clubId) where.$or = [{ local: Number(clubId) }, { visitante: Number(clubId) }];

    const partidos = await em.find(
      Partido,
      where,
      {
        populate: ['local', 'visitante', 'jornada'],
        orderBy: { fecha: 'ASC', id: 'ASC' },
      },
    );

    const filtered =
      from || to
        ? partidos.filter((p) => {
            if (!p.fecha) return false;
            const t = p.fecha.getTime();
            if (from && t < new Date(String(from)).getTime()) return false;
            if (to && t > new Date(String(to)).getTime()) return false;
            return true;
          })
        : partidos;

    res.status(200).json({
      message: 'Partidos obtenidos',
      count: filtered.length,
      data: filtered,
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error findAll partidos:', error);
      res.status(500).json({ message: 'Error obteniendo partidos', error: error.message });
    } else {
      res.status(500).json({ message: 'Error obteniendo partidos', error: String(error) });
    }
  }
}

/**
 * Recupera un partido por su ID
 * @param req El objeto de solicitud de Express que contiene el ID del partido en los parámetros
 * @param res El objeto de respuesta de Express
 * @returns Una respuesta HTTP 200 con un Json con el partido encontrado o un error HTTP 404 si no se encuentra
 */
async function findOne(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    const partido = await em.findOne(
      Partido,
      { id },
      { populate: ['local', 'visitante', 'jornada'] },
    );
    if (!partido) return res.status(404).json({ message: 'Partido no encontrado' });
    res.status(200).json({ message: 'Partido encontrado', data: partido });
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: 'Error obteniendo partido', error: error.message });
    } else {
      res.status(500).json({ message: 'Error obteniendo partido', error: String(error) });
    }
  }
}

/**
 * Crea un nuevo partido
 * @param req El objeto de solicitud de Express que contiene los datos del nuevo partido
 * @param res El objeto de respuesta de Express
 * @returns Una respuesta HTTP 201 con un Json con el partido creado o un error HTTP 500 con un mensaje
 */
async function add(req: Request, res: Response) {
  try {
    const { id_api, fecha, estado, estado_detalle, estadio, jornadaId, localId, visitanteId } = req.body;
    if (id_api == null || !jornadaId || !localId || !visitanteId) {
      return res
        .status(400)
        .json({ message: 'Faltan campos obligatorios (id_api, jornadaId, localId, visitanteId)' });
    }

    const jornada = await em.findOne(Jornada, { id: Number(jornadaId) });
    if (!jornada) return res.status(404).json({ message: 'Jornada no encontrada' });

    const local = await em.findOne(clubes, { id: Number(localId) });
    if (!local) return res.status(404).json({ message: 'Club local no encontrado' });

    const visitante = await em.findOne(clubes, { id: Number(visitanteId) });
    if (!visitante) return res.status(404).json({ message: 'Club visitante no encontrado' });

    let partido = await em.findOne(Partido, { id_api: Number(id_api) });
    if (partido) {
      return res.status(409).json({ message: 'Ya existe un partido con ese id_api' });
    }

    partido = em.create(Partido, {
      id_api: Number(id_api),
      fecha: fecha ? new Date(fecha) : null,
      estado: estado ?? null,
      estado_detalle: estado_detalle ?? null,
      estadio: estadio ?? null,
      jornada,
      local,
      visitante,
    });

    await em.persistAndFlush(partido);
    res.status(201).json({ message: 'Partido creado', data: partido });
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: 'Error creando partido', error: error.message });
    } else {
      res.status(500).json({ message: 'Error creando partido', error: String(error) });
    }
  }
}
/**
 * Actualiza un partido existente
 * @param req El objeto de solicitud de Express que contiene el ID del partido en los parámetros y los datos actualizados en el cuerpo
 * @param res El objeto de respuesta de Express
 * @returns Una respuesta HTTP 200 con un Json con el partido actualizado o un error HTTP 404 si no se encuentra
 */
async function update(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    const partido = await em.findOne(Partido, { id });
    if (!partido) return res.status(404).json({ message: 'Partido no encontrado' });

    const { fecha, estado, estado_detalle, estadio, jornadaId, localId, visitanteId } = req.body;

    if (fecha !== undefined) partido.fecha = fecha ? new Date(fecha) : null;
    if (estado !== undefined) partido.estado = estado ?? null;
    if (estado_detalle !== undefined) partido.estado_detalle = estado_detalle ?? null;
    if (estadio !== undefined) partido.estadio = estadio ?? null;

    if (jornadaId) {
      const jornada = await em.findOne(Jornada, { id: Number(jornadaId) });
      if (!jornada) return res.status(404).json({ message: 'Jornada no encontrada' });
      partido.jornada = jornada;
    }
    if (localId) {
      const local = await em.findOne(clubes, { id: Number(localId) });
      if (!local) return res.status(404).json({ message: 'Club local no encontrado' });
      partido.local = local;
    }
    if (visitanteId) {
      const visitante = await em.findOne(clubes, { id: Number(visitanteId) });
      if (!visitante) return res.status(404).json({ message: 'Club visitante no encontrado' });
      partido.visitante = visitante;
    }

    await em.flush();
    res.status(200).json({ message: 'Partido actualizado', data: partido });
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: 'Error actualizando partido', error: error.message });
    } else {
      res.status(500).json({ message: 'Error actualizando partido', error: String(error) });
    }
  }
}
/**
 * Elimina un partido existente
 * @param req El objeto de solicitud de Express que contiene el ID del partido a eliminar en los parámetros
 * @param res El objeto de respuesta de Express
 * @returns Una respuesta HTTP 200 con un Json con un mensaje de éxito o un error HTTP 404 si no se encuentra
 */
async function remove(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    const partido = await em.findOne(Partido, { id });
    if (!partido) return res.status(404).json({ message: 'Partido no encontrado' });
    await em.removeAndFlush(partido);
    res.status(200).json({ message: 'Partido eliminado' });
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: 'Error eliminando partido', error: error.message });
    } else {
      res.status(500).json({ message: 'Error eliminando partido', error: String(error) });
    }
  }
}

export { findAll, findOne, add, update, remove };