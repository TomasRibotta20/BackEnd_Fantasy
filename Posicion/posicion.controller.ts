import { Request, Response } from 'express';
import { Posicion } from './posicion.entity.js';
import { orm } from '../shared/db/orm.js';

const em = orm.em;

async function findAll(req: Request, res: Response) {
  try {
    const posiciones = await em.find(Posicion, {}, { populate: ['jugadores'] });
    res.status(200).json({ message: 'found all positions', data: posiciones });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

async function findOne(req: Request, res: Response) {
  try {
    const id = Number.parseInt(req.params.id);
    const posicion = await em.findOneOrFail(Posicion, { id }, { populate: ['jugadores'] });
    res.status(200).json({ message: 'found position', data: posicion });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

export { findAll, findOne };
