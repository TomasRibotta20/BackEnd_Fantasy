/* eslint-disable no-console */
/* eslint-disable no-await-in-loop */
import 'dotenv/config';
import 'reflect-metadata';
import type { MikroORM } from '@mikro-orm/core';
import { orm } from '../shared/db/orm.js';
import { getTeams, getPlayersByTeam } from '../shared/api/apisports.js';
import { clubes } from '../Club/club.entity.js';
import { Player } from '../Player/player.entity.js';
import { Position } from '../Position/position.entity.js';
import fs from 'node:fs/promises';
import path from 'node:path';

const AFA_LEAGUE_ID = Number(process.env.AFA_LEAGUE_ID || 128);
const AFA_SEASON = Number(process.env.AFA_SEASON || 2021);

// Archivo de checkpoint (para reanudar)
const CHECKPOINT_DIR = path.resolve(process.cwd(), 'data', 'seed-checkpoints');
const CHECKPOINT_FILE = path.join(CHECKPOINT_DIR, 'afa2021.json');

type Checkpoint = {
  lastTeamIndex: number;
  lastTeamId?: number;
  lastTeamName?: string;
};

async function readCheckpoint(): Promise<Checkpoint | null> {
  try {
    const raw = await fs.readFile(CHECKPOINT_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function writeCheckpoint(cp: Checkpoint) {
  await fs.mkdir(CHECKPOINT_DIR, { recursive: true });
  await fs.writeFile(CHECKPOINT_FILE, JSON.stringify(cp, null, 2), 'utf8');
}

async function ensurePosition(em: MikroORM['em'], description?: string | null) {
  if (!description) return null;
  const repo = em.getRepository(Position);
  const existing = await repo.findOne({ description });
  if (existing) return existing;
  const created = repo.create({ description });
  await em.persistAndFlush(created);
  return created;
}

async function main() {
  const em = orm.em.fork();

  console.log(`Cargando equipos AFA league=${AFA_LEAGUE_ID} season=${AFA_SEASON}`);
  const teams = await getTeams(AFA_LEAGUE_ID, AFA_SEASON);

  // Determinar inicio: env START_FROM_TEAM_ID o checkpoint
  const envTeamId = process.env.START_FROM_TEAM_ID
    ? Number(process.env.START_FROM_TEAM_ID)
    : undefined;
  let startIndex = 0;

  if (envTeamId) {
    const idx = teams.findIndex((t) => t.team.id === envTeamId);
    if (idx >= 0) startIndex = idx;
  } else {
    const cp = await readCheckpoint();
    if (cp && cp.lastTeamIndex + 1 < teams.length) {
      startIndex = cp.lastTeamIndex + 1;
      console.log(`Reanudando desde índice ${startIndex} (${teams[startIndex].team.name})`);
    }
  }

  // Upsert de clubes (idempotente)
  for (let i = 0; i < teams.length; i++) {
    const t = teams[i];
    const team = t.team;
    const venue = t.venue ?? {};
    let club = await em.findOne(clubes, { id_api: team.id });
    if (!club) {
      club = em.create(clubes, { id_api: team.id, nombre: team.name });
    }
    club.nombre = team.name ?? club.nombre;
    club.codigo = team.code ?? null;
    club.logo = team.logo ?? null;
    club.pais = team.country ?? null;
    club.fundado = (team.founded as number | undefined) ?? null;
    club.estadio_nombre = venue.name ?? null;
    club.estadio_ciudad = venue.city ?? null;
    club.estadio_capacidad = (venue.capacity as number | undefined) ?? null;
    club.estadio_imagen = venue.image ?? null;

    em.persist(club);
  }
  await em.flush();
  console.log(`Equipos upserted: ${teams.length}`);

  // Jugadores por equipo, desde el índice calculado
  for (let i = startIndex; i < teams.length; i++) {
    const t = teams[i];
    const teamId = t.team.id;
    const teamName = t.team.name;
    const club = await em.findOneOrFail(clubes, { id_api: teamId });

    console.log(`(${i + 1}/${teams.length}) Cargando jugadores de ${teamName} (${teamId})...`);
    const players = await getPlayersByTeam(teamId, AFA_SEASON);

    for (const p of players) {
      const pi = p.player;
      const games = p.statistics?.[0]?.games;

      let entity = await em.findOne(Player, { apiId: pi.id });
      if (!entity) {
        entity = em.create(Player, { apiId: pi.id, club });
      }
      entity.name = pi.name ?? null;
      entity.firstname = pi.firstname ?? null;
      entity.lastname = pi.lastname ?? null;
      entity.age = (pi.age as number | undefined) ?? null;
      entity.nationality = pi.nationality ?? null;
      entity.height = pi.height ?? null;
      entity.weight = pi.weight ?? null;
      entity.photo = pi.photo ?? null;
      entity.jerseyNumber = games?.number ?? null;
      entity.club = club;

      try {
        entity.position = await ensurePosition(em, games?.position ?? null);
      } catch {
        entity.position = null;
      }

      em.persist(entity);
    }

    await em.flush();

    // Guardar checkpoint tras cada equipo
    await writeCheckpoint({ lastTeamIndex: i, lastTeamId: teamId, lastTeamName: teamName });

    // Pequeña pausa entre equipos (ayuda al rate limit)
    await new Promise((r) => setTimeout(r, 1500));
  }

  await orm.close(true);
  console.log('Seed AFA 2021 completado');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
