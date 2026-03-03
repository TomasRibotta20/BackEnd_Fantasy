import { EntityManager } from '@mikro-orm/mysql';
import {
  getTeams,
  getPlayersByTeam,
  getAllFixtures,
  TeamItem,
  FixtureItem,
} from '../shared/api/apisports.js';
import { clubes } from '../Club/club.entity.js';
import { Player } from '../Player/player.entity.js';
import { Position } from '../Position/position.entity.js';
import { Jornada } from '../Fixture/Jornada.entity.js';
import { Partido } from '../Fixture/partido.entity.js';
import { GameConfig } from '../Config/gameConfig.entity.js';
import { EstadisticaJugador } from '../EstadisticaJugador/estadistica-jugador.entity.js';
import { OfertaVenta } from '../Ventas/ofertaVenta.entity.js';
import { MercadoPuja } from '../Mercado/mercadoPuja.entity.js';
import { ItemMercado } from '../Mercado/itemMercado.entity.js';
import { Transaccion } from '../Equipo/transaccion.entity.js';
import { EquipoJornadaJugador } from '../Equipo/equipoJornadaJugador.entity.js';
import { Recompensa } from '../Recompensa/recompensa.entity.js';
import { JugadorTorneo } from '../Mercado/jugadorTorneo.entity.js';
import { EquipoJornada } from '../Equipo/equipoJornada.entity.js';
import { EquipoJugador } from '../Equipo/equipoJugador.entity.js';
import { HistorialPrecio } from '../HistorialPrecio/historial-precio.entity.js';
import { MercadoDiario } from '../Mercado/mercadoDiario.entity.js';
import { Equipo } from '../Equipo/equipo.entity.js';
import { TorneoUsuario } from '../Torneo/torneoUsuario.entity.js';
import { Torneo } from '../Torneo/torneo.entity.js';

export interface SeedResult {
  clubes: number;
  jugadores: number;
  posiciones: number;
  jornadas: number;
  partidos: number;
}

export class SeedService {
  private positionCache = new Map<string, Position>();

  constructor(private em: EntityManager) {}

  async execute(leagueId: number, season: number): Promise<SeedResult> {
    // 1. Fetch datos de la API ANTES de borrar (si la API falla, la BD queda intacta)
    console.log('Obteniendo equipos de la API...');
    const teams = await getTeams(leagueId, season);
    console.log(`Equipos obtenidos: ${teams.length}`);

    console.log('Obteniendo fixtures de la API...');
    const fixtures = await getAllFixtures(leagueId, season);
    console.log(`Fixtures obtenidos: ${fixtures.length}`);

    // 2. Limpiar base de datos
    console.log('Limpiando base de datos...');
    await this.cleanDatabase();
    console.log('Base de datos limpiada');

    // 3. Seedear clubs
    console.log('Creando clubes...');
    const clubMap = await this.seedClubs(teams);
    console.log(`Clubes creados: ${clubMap.size}`);

    // 4. Seedear jugadores (incluye posiciones)
    console.log('Creando jugadores...');
    const playerCount = await this.seedPlayers(teams, clubMap, season);
    console.log(`Jugadores creados: ${playerCount}`);

    // 5. Seedear fixtures (jornadas + partidos)
    console.log('Creando jornadas y partidos...');
    const fixtureResult = await this.seedFixtures(fixtures, clubMap, leagueId, season);
    console.log(`Jornadas creadas: ${fixtureResult.jornadasCount}, Partidos creados: ${fixtureResult.partidosCount}`);

    return {
      clubes: clubMap.size,
      jugadores: playerCount,
      posiciones: this.positionCache.size,
      jornadas: fixtureResult.jornadasCount,
      partidos: fixtureResult.partidosCount,
    };
  }

  private async cleanDatabase(): Promise<void> {
    // Borrar en orden FK-safe (de hojas a raices)
    await this.em.nativeDelete(EstadisticaJugador, {});
    await this.em.nativeDelete(OfertaVenta, {});
    await this.em.nativeDelete(MercadoPuja, {});
    await this.em.nativeDelete(ItemMercado, {});
    await this.em.nativeDelete(Transaccion, {});
    await this.em.nativeDelete(EquipoJornadaJugador, {});
    await this.em.nativeDelete(Recompensa, {});
    await this.em.nativeDelete(JugadorTorneo, {});
    await this.em.nativeDelete(EquipoJornada, {});
    await this.em.nativeDelete(EquipoJugador, {});
    await this.em.nativeDelete(HistorialPrecio, {});
    await this.em.nativeDelete(MercadoDiario, {});
    await this.em.nativeDelete(TorneoUsuario, {});
    await this.em.nativeDelete(Equipo, {});
    await this.em.nativeDelete(Torneo, {});
    await this.em.nativeDelete(Partido, {});

    const config = await this.em.findOne(GameConfig, 1);
    if (config) {
      config.jornada_activa = undefined as any;
      await this.em.flush();
    }

    await this.em.nativeDelete(Player, {});
    await this.em.nativeDelete(Jornada, {});
    await this.em.nativeDelete(clubes, {});
    await this.em.nativeDelete(Position, {});
  }

  private async seedClubs(teams: TeamItem[]): Promise<Map<number, clubes>> {
    const clubMap = new Map<number, clubes>();

    for (const team of teams) {
      const club = this.em.create(clubes, {
        id_api: team.team.id,
        nombre: team.team.name,
        codigo: team.team.code,
        logo: team.team.logo,
        pais: team.team.country,
        fundado: team.team.founded,
        estadio_nombre: team.venue?.name,
        estadio_ciudad: team.venue?.city,
        estadio_capacidad: team.venue?.capacity,
        estadio_imagen: team.venue?.image,
      });
      clubMap.set(team.team.id, club);
    }

    await this.em.flush();
    return clubMap;
  }

  private async seedPlayers(
    teams: TeamItem[],
    clubMap: Map<number, clubes>,
    season: number,
  ): Promise<number> {
    let playerCount = 0;

    for (const team of teams) {
      const club = clubMap.get(team.team.id);
      if (!club) continue;

      console.log(`  Obteniendo jugadores de ${team.team.name}...`);
      const players = await getPlayersByTeam(team.team.id, season);

      for (const playerItem of players) {
        const posName = playerItem.statistics?.[0]?.games?.position || 'Unknown';
        const position = await this.getOrCreatePosition(posName);

        this.em.create(Player, {
          id_api: playerItem.player.id,
          nombre: playerItem.player.name,
          primer_nombre: playerItem.player.firstname,
          apellido: playerItem.player.lastname,
          edad: playerItem.player.age,
          nacionalidad: playerItem.player.nationality,
          altura: playerItem.player.height,
          peso: playerItem.player.weight,
          foto: playerItem.player.photo,
          numero_camiseta: playerItem.statistics?.[0]?.games?.number,
          club,
          posicion: position,
        });
        playerCount++;
      }
      await this.em.flush();
      console.log(`  ${team.team.name}: ${players.length} jugadores`);
    }

    return playerCount;
  }

  private async getOrCreatePosition(posName: string): Promise<Position> {
    if (this.positionCache.has(posName)) {
      return this.positionCache.get(posName)!;
    }

    let position = await this.em.findOne(Position, { descripcion: posName });
    if (!position) {
      position = this.em.create(Position, { descripcion: posName });
      await this.em.flush();
    }

    this.positionCache.set(posName, position);
    return position;
  }

  private async seedFixtures(
    fixtures: FixtureItem[],
    clubMap: Map<number, clubes>,
    leagueId: number,
    season: number,
  ): Promise<{ jornadasCount: number; partidosCount: number }> {

    const roundMap = new Map<string, FixtureItem[]>();
    for (const fixture of fixtures) {
      const round = fixture.league.round;
      if (!roundMap.has(round)) {
        roundMap.set(round, []);
      }
      roundMap.get(round)!.push(fixture);
    }

    const jornadaMap = new Map<string, Jornada>();
    for (const [roundName, roundFixtures] of roundMap) {
      const dates = roundFixtures.map((f) => new Date(f.fixture.date).getTime());
      const fechaInicio = new Date(Math.min(...dates));
      const fechaFin = new Date(Math.max(...dates));
      const stage = roundFixtures[0].league.stage || null;

      const jornada = this.em.create(Jornada, {
        nombre: roundName,
        temporada: season,
        etapa: stage,
        liga_id: leagueId,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
      });
      jornadaMap.set(roundName, jornada);
    }

    await this.em.flush();

    let partidoCount = 0;
    for (const fixture of fixtures) {
      const jornada = jornadaMap.get(fixture.league.round);
      const local = clubMap.get(fixture.teams.home.id);
      const visitante = clubMap.get(fixture.teams.away.id);

      if (!local || !visitante) {
        console.warn(
          `  Skipping fixture ${fixture.fixture.id}: club local (${fixture.teams.home.id}) o visitante (${fixture.teams.away.id}) no encontrado`,
        );
        continue;
      }

      this.em.create(Partido, {
        id_api: fixture.fixture.id,
        fecha: new Date(fixture.fixture.date),
        estado: fixture.fixture.status?.short,
        estado_detalle: fixture.fixture.status?.long,
        estadio: fixture.fixture.venue?.name,
        local,
        visitante,
        jornada: jornada!,
      });
      partidoCount++;
    }
    await this.em.flush();
    return { jornadasCount: jornadaMap.size, partidosCount: partidoCount };
  }
}
