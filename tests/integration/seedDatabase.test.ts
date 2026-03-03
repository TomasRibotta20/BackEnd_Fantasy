import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import type { MikroORM } from '@mikro-orm/core';
import type { EntityManager } from '@mikro-orm/mysql';
import { createTestDatabase, closeTestDatabase, clearDatabase } from '../setup/testDatabase.js';
import type { TeamItem, PlayerItem, FixtureItem } from '../../src/shared/api/apisports.js';
import type { SeedResult } from '../../src/admin/admin.seed.service.js';
import { clubes } from '../../src/Club/club.entity.js';
import { Player } from '../../src/Player/player.entity.js';
import { Position } from '../../src/Position/position.entity.js';
import { Jornada } from '../../src/Fixture/Jornada.entity.js';
import { Partido } from '../../src/Fixture/partido.entity.js';

const FAKE_TEAMS: TeamItem[] = [
  {
    team: {
      id: 100, name: 'Club Alpha', code: 'ALP', country: 'Argentina',
      founded: 1905, national: false, logo: 'https://img.example.com/alpha.png',
    },
    venue: {
      id: 1, name: 'Estadio Alpha', address: 'Av. Siempre Viva 123',
      city: 'Buenos Aires', capacity: 50000, surface: 'grass',
      image: 'https://img.example.com/estadio-alpha.png',
    },
  },
  {
    team: {
      id: 200, name: 'Club Beta', code: 'BET', country: 'Argentina',
      founded: 1920, national: false, logo: 'https://img.example.com/beta.png',
    },
    venue: {
      id: 2, name: 'Estadio Beta', address: null, city: 'Cordoba',
      capacity: 30000, surface: null, image: null,
    },
  },
  {
    team: {
      id: 300, name: 'Club Gamma', code: null, country: null,
      founded: null, national: null, logo: null,
    },
  },
];

const FAKE_PLAYERS_BY_TEAM: Record<number, PlayerItem[]> = {
  100: [
    {
      player: {
        id: 1001, name: 'Carlos Garcia', firstname: 'Carlos', lastname: 'Garcia',
        age: 28, nationality: 'Argentina', height: '185 cm', weight: '80 kg',
        photo: 'https://img.example.com/p1001.png',
      },
      statistics: [{ games: { position: 'Goalkeeper', number: 1 } }],
    },
    {
      player: {
        id: 1002, name: 'Juan Lopez', firstname: 'Juan', lastname: 'Lopez',
        age: 25, nationality: 'Argentina', height: '180 cm', weight: '75 kg',
        photo: 'https://img.example.com/p1002.png',
      },
      statistics: [{ games: { position: 'Defender', number: 4 } }],
    },
  ],
  200: [
    {
      player: {
        id: 2001, name: 'Pedro Martinez', firstname: 'Pedro', lastname: 'Martinez',
        age: 30, nationality: 'Brazil', height: '175 cm', weight: '70 kg',
        photo: 'https://img.example.com/p2001.png',
      },
      statistics: [{ games: { position: 'Midfielder', number: 10 } }],
    },
    {
      player: {
        id: 2002, name: 'Unknown Position Player', firstname: null, lastname: null,
        age: null, nationality: null, height: null, weight: null, photo: null,
      },
    },
  ],
  300: [
    {
      player: {
        id: 3001, name: 'Diego Fernandez', firstname: 'Diego', lastname: 'Fernandez',
        age: 22, nationality: 'Uruguay', height: '178 cm', weight: '72 kg',
        photo: 'https://img.example.com/p3001.png',
      },
      statistics: [{ games: { position: 'Attacker', number: 9 } }],
    },
    {
      player: {
        id: 3002, name: 'Luis Perez', firstname: 'Luis', lastname: 'Perez',
        age: 33, nationality: 'Chile', height: '190 cm', weight: '85 kg',
        photo: 'https://img.example.com/p3002.png',
      },
      statistics: [{ games: { position: 'Goalkeeper', number: 12 } }],
    },
  ],
};

const FAKE_FIXTURES: FixtureItem[] = [
  {
    fixture: {
      id: 5001, date: '2025-03-01T18:00:00Z',
      status: { short: 'FT', long: 'Match Finished' },
      venue: { name: 'Estadio Alpha' },
    },
    league: { id: 128, season: 2025, round: 'Regular Season - 1', stage: 'Regular Season' },
    teams: {
      home: { id: 100, name: 'Club Alpha', logo: 'alpha.png' },
      away: { id: 200, name: 'Club Beta', logo: 'beta.png' },
    },
  },
  {
    fixture: {
      id: 5002, date: '2025-03-02T20:00:00Z',
      status: { short: 'NS', long: 'Not Started' },
      venue: { name: 'Estadio Gamma' },
    },
    league: { id: 128, season: 2025, round: 'Regular Season - 1', stage: 'Regular Season' },
    teams: {
      home: { id: 300, name: 'Club Gamma' },
      away: { id: 100, name: 'Club Alpha' },
    },
  },
  {
    fixture: {
      id: 5003, date: '2025-03-08T19:00:00Z',
      status: { short: 'NS', long: 'Not Started' },
      venue: { name: null },
    },
    league: { id: 128, season: 2025, round: 'Regular Season - 2', stage: 'Regular Season' },
    teams: {
      home: { id: 200, name: 'Club Beta' },
      away: { id: 300, name: 'Club Gamma' },
    },
  },
  {
    // Fixture con equipo que NO existe en FAKE_TEAMS -> sera skipped
    fixture: {
      id: 5004, date: '2025-03-15T19:00:00Z',
      status: { short: 'NS', long: 'Not Started' },
    },
    league: { id: 128, season: 2025, round: 'Regular Season - 3', stage: 'Regular Season' },
    teams: {
      home: { id: 999, name: 'Unknown Team' },
      away: { id: 100, name: 'Club Alpha' },
    },
  },
];

// ============================================================
// MOCK SETUP (antes del import dinamico de SeedService)
// ============================================================

const mockGetTeams = jest.fn<(leagueId: number, season: number) => Promise<TeamItem[]>>();
const mockGetPlayersByTeam = jest.fn<(teamId: number, season: number) => Promise<PlayerItem[]>>();
const mockGetAllFixtures = jest.fn<(leagueId: number, season: number) => Promise<FixtureItem[]>>();

jest.unstable_mockModule('../../src/shared/api/apisports.js', () => ({
  getTeams: mockGetTeams,
  getPlayersByTeam: mockGetPlayersByTeam,
  getAllFixtures: mockGetAllFixtures,
}));

const { SeedService } = await import('../../src/admin/admin.seed.service.js');

// ============================================================
// TESTS
// ============================================================

describe('SeedService.execute() - Integration Test', () => {
  let orm: MikroORM;
  let result: SeedResult;

  beforeAll(async () => {
    orm = await createTestDatabase();

    mockGetTeams.mockResolvedValue(FAKE_TEAMS);
    mockGetPlayersByTeam.mockImplementation(async (teamId: number) => {
      return FAKE_PLAYERS_BY_TEAM[teamId] ?? [];
    });
    mockGetAllFixtures.mockResolvedValue(FAKE_FIXTURES);

    const em = orm.em.fork() as EntityManager;
    const service = new SeedService(em);
    result = await service.execute(128, 2025);
  }, 120_000);

  afterAll(async () => {
    await clearDatabase(orm);
    await closeTestDatabase();
  });

  it('debe retornar los conteos correctos en SeedResult', () => {
    expect(result).toEqual({
      clubes: 3,
      jugadores: 6,
      posiciones: 5,
      jornadas: 3,
      partidos: 3,
    });
  });

  it('debe crear todos los clubes con mapeo correcto de campos', async () => {
    const em = orm.em.fork();
    const clubs = await em.find(clubes, {}, { orderBy: { id_api: 'ASC' } });

    expect(clubs).toHaveLength(3);

    // Club Alpha: datos completos + venue
    const alpha = clubs.find(c => c.id_api === 100)!;
    expect(alpha).toBeDefined();
    expect(alpha.nombre).toBe('Club Alpha');
    expect(alpha.codigo).toBe('ALP');
    expect(alpha.pais).toBe('Argentina');
    expect(alpha.fundado).toBe(1905);
    expect(alpha.logo).toBe('https://img.example.com/alpha.png');
    expect(alpha.estadio_nombre).toBe('Estadio Alpha');
    expect(alpha.estadio_ciudad).toBe('Buenos Aires');
    expect(alpha.estadio_capacidad).toBe(50000);
    expect(alpha.estadio_imagen).toBe('https://img.example.com/estadio-alpha.png');

    // Club Gamma: sin venue, campos null
    const gamma = clubs.find(c => c.id_api === 300)!;
    expect(gamma).toBeDefined();
    expect(gamma.nombre).toBe('Club Gamma');
    expect(gamma.codigo).toBeNull();
    expect(gamma.pais).toBeNull();
    expect(gamma.fundado).toBeNull();
  });

  it('debe crear todos los jugadores con campos y relaciones correctas', async () => {
    const em = orm.em.fork();
    const players = await em.find(Player, {}, {
      populate: ['club', 'posicion'],
      orderBy: { id_api: 'ASC' },
    });

    expect(players).toHaveLength(6);

    // Jugador completo
    const carlos = players.find(p => p.id_api === 1001)!;
    expect(carlos).toBeDefined();
    expect(carlos.nombre).toBe('Carlos Garcia');
    expect(carlos.primer_nombre).toBe('Carlos');
    expect(carlos.apellido).toBe('Garcia');
    expect(carlos.edad).toBe(28);
    expect(carlos.nacionalidad).toBe('Argentina');
    expect(carlos.altura).toBe('185 cm');
    expect(carlos.peso).toBe('80 kg');
    expect(carlos.foto).toBe('https://img.example.com/p1001.png');
    expect(carlos.numero_camiseta).toBe(1);
    expect(carlos.club.id_api).toBe(100);
    expect(carlos.posicion!.descripcion).toBe('Goalkeeper');

    // Jugador sin statistics -> posicion Unknown, campos null
    const unknown = players.find(p => p.id_api === 2002)!;
    expect(unknown).toBeDefined();
    expect(unknown.nombre).toBe('Unknown Position Player');
    expect(unknown.club.id_api).toBe(200);
    expect(unknown.posicion!.descripcion).toBe('Unknown');
  });

  it('debe crear todas las posiciones esperadas incluyendo Unknown', async () => {
    const em = orm.em.fork();
    const positions = await em.find(Position, {});

    const names = positions.map(p => p.descripcion).sort();
    expect(names).toEqual(['Attacker', 'Defender', 'Goalkeeper', 'Midfielder', 'Unknown']);
  });

  it('debe crear jornadas con rangos de fechas y metadata correctos', async () => {
    const em = orm.em.fork();
    const jornadas = await em.find(Jornada, {}, { orderBy: { nombre: 'ASC' } });

    expect(jornadas).toHaveLength(3);

    // Round 1: dos fixtures (1 marzo 18:00 y 2 marzo 20:00)
    const round1 = jornadas.find(j => j.nombre === 'Regular Season - 1')!;
    expect(round1).toBeDefined();
    expect(round1.temporada).toBe(2025);
    expect(round1.etapa).toBe('Regular Season');
    expect(round1.liga_id).toBe(128);
    expect(new Date(round1.fecha_inicio!).getTime()).toBe(new Date('2025-03-01T18:00:00Z').getTime());
    expect(new Date(round1.fecha_fin!).getTime()).toBe(new Date('2025-03-02T20:00:00Z').getTime());

    // Round 2: un solo fixture (8 marzo 19:00)
    const round2 = jornadas.find(j => j.nombre === 'Regular Season - 2')!;
    expect(round2).toBeDefined();
    expect(new Date(round2.fecha_inicio!).getTime()).toBe(new Date('2025-03-08T19:00:00Z').getTime());
    expect(new Date(round2.fecha_fin!).getTime()).toBe(new Date('2025-03-08T19:00:00Z').getTime());

    // Round 3: existe aunque su partido fue skipped
    const round3 = jornadas.find(j => j.nombre === 'Regular Season - 3')!;
    expect(round3).toBeDefined();
    expect(round3.temporada).toBe(2025);
  });

  it('debe crear partidos con relaciones correctas a clubes y jornadas', async () => {
    const em = orm.em.fork();
    const partidos = await em.find(Partido, {}, {
      populate: ['local', 'visitante', 'jornada'],
      orderBy: { id_api: 'ASC' },
    });

    expect(partidos).toHaveLength(3);

    // Fixture 5001: Alpha (local) vs Beta (visitante), Round 1
    const p1 = partidos.find(p => p.id_api === 5001)!;
    expect(p1).toBeDefined();
    expect(p1.local.id_api).toBe(100);
    expect(p1.visitante.id_api).toBe(200);
    expect(p1.jornada.nombre).toBe('Regular Season - 1');
    expect(p1.estado).toBe('FT');
    expect(p1.estado_detalle).toBe('Match Finished');
    expect(p1.estadio).toBe('Estadio Alpha');

    // Fixture 5003: Beta (local) vs Gamma (visitante), Round 2, venue null
    const p3 = partidos.find(p => p.id_api === 5003)!;
    expect(p3).toBeDefined();
    expect(p3.local.id_api).toBe(200);
    expect(p3.visitante.id_api).toBe(300);
    expect(p3.jornada.nombre).toBe('Regular Season - 2');
    expect(p3.estadio).toBeNull();
  });

  it('debe skipear el fixture con equipo inexistente', async () => {
    const em = orm.em.fork();

    // Fixture 5004 NO debe existir como Partido
    const skipped = await em.findOne(Partido, { id_api: 5004 });
    expect(skipped).toBeNull();

    // Pero su jornada (Round 3) SI debe existir
    const round3 = await em.findOne(Jornada, { nombre: 'Regular Season - 3' });
    expect(round3).not.toBeNull();
  });

  it('debe llamar a las funciones de API con los argumentos correctos', () => {
    expect(mockGetTeams).toHaveBeenCalledTimes(1);
    expect(mockGetTeams).toHaveBeenCalledWith(128, 2025);

    expect(mockGetAllFixtures).toHaveBeenCalledTimes(1);
    expect(mockGetAllFixtures).toHaveBeenCalledWith(128, 2025);

    // getPlayersByTeam se llama una vez por equipo
    expect(mockGetPlayersByTeam).toHaveBeenCalledTimes(3);
    expect(mockGetPlayersByTeam).toHaveBeenCalledWith(100, 2025);
    expect(mockGetPlayersByTeam).toHaveBeenCalledWith(200, 2025);
    expect(mockGetPlayersByTeam).toHaveBeenCalledWith(300, 2025);
  });
});
