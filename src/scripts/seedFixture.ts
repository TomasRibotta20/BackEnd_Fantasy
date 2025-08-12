/* eslint-disable no-console */
import 'dotenv/config';
import 'reflect-metadata';
import { orm } from '../shared/db/orm.js';
import { getFixturesSecondPhase } from '../shared/api/apisports.js';
import { clubes } from '../Club/club.entity.js';
import { Jornada } from '../Fixture/Jornada.entity.js';
import { Partido } from '../Fixture/partido.entity.js';

const AFA_LEAGUE_ID = Number(process.env.AFA_LEAGUE_ID || 128);
const AFA_SEASON = Number(process.env.AFA_SEASON || 2021);

async function main() {
  const em = orm.em.fork();

  console.log(`Descargando fixtures segunda fase AFA league=${AFA_LEAGUE_ID} season=${AFA_SEASON}...`);
  const fixtures = await getFixturesSecondPhase(AFA_LEAGUE_ID, AFA_SEASON);
  console.log(`Fixtures recibidos: ${fixtures.length}`);

  // Cache de jornadas por nombre
  const jornadasMap = new Map<string, Jornada>();
  const minMaxPorJornada = new Map<string, { min?: Date; max?: Date }>();

  for (const fx of fixtures) {
    const roundName = fx.league.round; // ej: "2nd Phase - 1"
    const etapa = fx.league.stage ?? '2nd Phase';

    // Jornada (upsert por nombre)
    let jornada = jornadasMap.get(roundName);
    if (!jornada) {
      jornada = (await em.findOne(Jornada, { nombre: roundName })) ?? undefined;
      if (!jornada) {
        jornada = em.create(Jornada, {
          nombre: roundName,
          temporada: AFA_SEASON,
          etapa,
          liga_id: AFA_LEAGUE_ID,
        });
      }
      jornadasMap.set(roundName, jornada);
      em.persist(jornada);
    }

    // Clubs (deben existir por id_api)
    const home = await em.findOne(clubes, { id_api: fx.teams.home.id });
    const away = await em.findOne(clubes, { id_api: fx.teams.away.id });
    if (!home || !away) {
      console.warn(`Saltando fixture ${fx.fixture.id}, club no encontrado (home=${fx.teams.home.id}, away=${fx.teams.away.id})`);
      continue;
    }

    // Partido (upsert por id_api)
    let partido = await em.findOne(Partido, { id_api: fx.fixture.id });
    if (!partido) {
      partido = em.create(Partido, { id_api: fx.fixture.id, jornada, local: home, visitante: away });
    }
    partido.jornada = jornada;
    partido.local = home;
    partido.visitante = away;
    partido.fecha = fx.fixture.date ? new Date(fx.fixture.date) : null;
    partido.estado = fx.fixture.status?.short ?? null;
    partido.estado_detalle = fx.fixture.status?.long ?? null;
    partido.estadio = fx.fixture.venue?.name ?? null;

    // Min/Max por jornada
    const t = partido.fecha ?? null;
    if (t) {
      const mm = minMaxPorJornada.get(roundName) ?? {};
      mm.min = !mm.min || t < mm.min ? t : mm.min;
      mm.max = !mm.max || t > mm.max ? t : mm.max;
      minMaxPorJornada.set(roundName, mm);
    }

    em.persist(partido);
  }

  await em.flush();

  // Actualizar fecha_inicio/fin por jornada
  for (const [roundName, mm] of minMaxPorJornada.entries()) {
    const jornada = jornadasMap.get(roundName) ?? await em.findOne(Jornada, { nombre: roundName });
    if (jornada) {
      jornada.fecha_inicio = mm.min ?? null;
      jornada.fecha_fin = mm.max ?? null;
      em.persist(jornada);
    }
  }

  await em.flush();
  await orm.close(true);
  console.log('Fixtures segunda fase AFA 2021 cargados.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});