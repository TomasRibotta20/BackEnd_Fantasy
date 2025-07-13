/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import { Clubs } from './club.entity.js';
import { orm } from '../shared/db/orm.js';

const em = orm.em;

async function findAll(req: Request, res: Response) {
  try {
    const clubs = await em.find(Clubs, {});
    res.status(200).json({ message: 'found all Clubs', data: clubs });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

async function findOne(req: Request, res: Response) {
  try {
    const id = Number.parseInt(req.params.id);
    const club = await em.findOneOrFail(Clubs, { id });
    res.status(200).json({ message: 'found club', data: club });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

async function add(req: Request, res: Response) {
  try {
    const club = em.create(Clubs, req.body);
    await em.flush();
    res.status(201).json({ message: 'club created', data: club });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

async function update(req: Request, res: Response) {
  try {
    const id = Number.parseInt(req.params.id);
    const club = em.getReference(Clubs, id);
    em.assign(club, req.body);
    await em.flush();
    res.status(200).json({ message: 'club updated' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

async function remove(req: Request, res: Response) {
  try {
    const id = Number.parseInt(req.params.id);
    const club = em.getReference(Clubs, id);
    await em.removeAndFlush(club);
    res.status(200).send({ message: 'club deleted' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

export { findAll, findOne, add, update, remove };
