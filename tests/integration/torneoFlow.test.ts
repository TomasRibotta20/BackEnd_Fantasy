// tests/integration/torneoFlow.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach , afterEach} from '@jest/globals';
import request from 'supertest';
import { MikroORM } from '@mikro-orm/core';
import { Application } from 'express';
import { createTestDatabase, closeTestDatabase, clearDatabase } from '../setup/testDatabase.js';
import { createTestApp } from '../setup/testServer.js';
import { Users } from '../../src/User/user.entity.js';
import { Position } from '../../src/Position/position.entity.js';
import { clubes as Club } from '../../src/Club/club.entity.js';
import { Player } from '../../src/Player/player.entity.js';
import { GameConfig } from '../../src/Config/gameConfig.entity.js';
import { Equipo } from '../../src/Equipo/equipo.entity.js';
import { EquipoJugador } from '../../src/Equipo/equipoJugador.entity.js';

describe('Integration Test - Flujo completo de Torneo', () => {
  let orm: MikroORM;
  let app: Application;
  
  // Tokens de autenticación
  let user1Token: string;
  let user2Token: string;
  
  // IDs de usuarios
  let user1Id: number;
  let user2Id: number;
  
  // ID del torneo
  let torneoId: number;
  let codigoAcceso: string;

  /**
   * Setup inicial: Base de datos y app
   */
  beforeAll(async () => {
    orm = await createTestDatabase();
    app = createTestApp(orm);
  }, 30000);

  afterAll(async () => {
    // Limpieza final antes de cerrar
    await clearDatabase(orm);
    await closeTestDatabase();
  }, 30000);

  beforeEach(async () => {
    await clearDatabase(orm);
    await seedMinimalData(orm);
  }, 30000);

  afterEach(async () => {
    // Limpieza después de cada test (incluso si falla)
    await clearDatabase(orm);
  }, 30000);

  /**
   * TEST PRINCIPAL: Flujo completo de torneo
   * 1. Registrar 2 usuarios
   * 2. Login de ambos usuarios
   * 3. Usuario 1 crea torneo
   * 4. Usuario 2 se une al torneo
   * 5. Usuario 1 inicia el torneo
   * 6. Verificar que ambos equipos tienen 15 jugadores (11 titulares + 4 suplentes)
   * 7. Verificar formación 4-3-3 en titulares
   * 8. Verificar presupuesto correcto
   * 9. Verificar que no hay jugadores duplicados entre equipos
   */
  it('debe completar el flujo: registro → login → crear torneo → unirse → iniciar → verificar draft', async () => {
    // ========== PASO 1: Registrar Usuario 1 ==========
    const registerUser1 = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'user1@test.com',
        password: 'Password123!',
        username: 'TestUser1'
      });

    expect(registerUser1.status).toBe(201);
    expect(registerUser1.body.data).toHaveProperty('id');
    user1Id = registerUser1.body.data.id;

    // ========== PASO 2: Registrar Usuario 2 ==========
    const registerUser2 = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'user2@test.com',
        password: 'Password123!',
        username: 'TestUser2'
      });

    expect(registerUser2.status).toBe(201);
    expect(registerUser2.body.data).toHaveProperty('id');
    user2Id = registerUser2.body.data.id;

    // ========== PASO 3: Login Usuario 1 ==========
    const loginUser1 = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'user1@test.com',
        password: 'Password123!'
      });

    expect(loginUser1.status).toBe(200);
    const cookies1 = loginUser1.headers['set-cookie'];
    expect(cookies1).toBeDefined();
    user1Token = extractAccessToken(Array.isArray(cookies1) ? cookies1 : [cookies1]);

    // ========== PASO 4: Login Usuario 2 ==========
    const loginUser2 = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'user2@test.com',
        password: 'Password123!'
      });

    expect(loginUser2.status).toBe(200);
    const cookies2 = loginUser2.headers['set-cookie'];
    expect(cookies2).toBeDefined();
    user2Token = extractAccessToken(Array.isArray(cookies2) ? cookies2 : [cookies2]);

    // ========== PASO 5: Usuario 1 crea torneo ==========
    const createTorneo = await request(app)
      .post('/api/torneo')
      .set('Cookie', [`access_token=${user1Token}`])
      .send({
        nombre: 'Liga Test Integration',
        descripcion: 'Torneo de prueba para test de integración',
        cupoMaximo: 2,
        nombre_equipo: 'Equipo User1'
      });

    expect(createTorneo.status).toBe(201);
    expect(createTorneo.body.data).toHaveProperty('id');
    expect(createTorneo.body.data).toHaveProperty('codigo_acceso');
    torneoId = createTorneo.body.data.id;  // ✅ CORREGIDO: sin .torneo
    codigoAcceso = createTorneo.body.data.codigo_acceso;  // ✅ CORREGIDO: sin .torneo

    // ========== PASO 6: Usuario 2 se une al torneo ==========
    const joinTorneo = await request(app)
      .post('/api/torneo/unirse')
      .set('Cookie', [`access_token=${user2Token}`])
      .send({
        codigo_acceso: codigoAcceso,
        nombre_equipo: 'Equipo User2'
      });

    expect(joinTorneo.status).toBe(201);
    expect(joinTorneo.body.message).toContain('unido exitosamente');

    // ========== PASO 7: Usuario 1 inicia el torneo ==========
    const iniciarTorneo = await request(app)
      .post(`/api/torneo/iniciar/${torneoId}`)
      .set('Cookie', [`access_token=${user1Token}`]);

    expect(iniciarTorneo.status).toBe(200);
    expect(iniciarTorneo.body.message).toContain('iniciado');

    // ========== PASO 8: Verificar equipos y jugadores ==========
    const em = orm.em.fork();

    // Obtener ambos equipos con jugadores
    const equipos = await em.find(Equipo, {
      torneoUsuario: { torneo: torneoId }
    }, {
      populate: ['jugadores', 'jugadores.jugador', 'jugadores.jugador.position', 'torneoUsuario']
    });

    expect(equipos).toHaveLength(2);

    // Verificar cada equipo
    for (const equipo of equipos) {
      const jugadores = equipo.jugadores.getItems();

      // TEST: Debe tener exactamente 15 jugadores
      expect(jugadores).toHaveLength(15);

      // Separar titulares y suplentes
      const titulares = jugadores.filter(ej => ej.es_titular);
      const suplentes = jugadores.filter(ej => !ej.es_titular);

      // TEST: 11 titulares + 4 suplentes
      expect(titulares).toHaveLength(11);
      expect(suplentes).toHaveLength(4);

      // Contar titulares por posición
      const conteoPosiciones = titulares.reduce((acc, ej) => {
        const jugador = ej.jugador as any as Player;
        const posicion = jugador.position?.description;
        acc[posicion||""] = (acc[posicion||""] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // TEST: Formación 4-3-3 (1 GK, 4 DEF, 3 MID, 3 ATT)
      expect(conteoPosiciones['Goalkeeper']).toBe(1);
      expect(conteoPosiciones['Defender']).toBe(4);
      expect(conteoPosiciones['Midfielder']).toBe(3);
      expect(conteoPosiciones['Attacker']).toBe(3);

      // Verificar que cada suplente es de una posición diferente
      const posicionesSuplentes = suplentes.map(ej => (ej.jugador as any as Player).position?.description);
      const posicionesUnicas = new Set(posicionesSuplentes);
      expect(posicionesUnicas.size).toBe(4); // 1 por cada posición

      // Calcular valor del equipo
      const valorEquipo = jugadores.reduce((sum, ej) => {
        return sum + ((ej.jugador as any as Player).precio_actual || 0);
      }, 0);

      // TEST: Presupuesto = 90M - valor_equipo
      const presupuestoEsperado = 90000000 - valorEquipo;
      expect(equipo.presupuesto).toBe(presupuestoEsperado);

      // Verificar que el presupuesto está en rango válido (entre 20M y 34M restantes)
      expect(equipo.presupuesto).toBeGreaterThanOrEqual(20000000);
      expect(equipo.presupuesto).toBeLessThanOrEqual(34000000);
    }

    // TEST: Verificar que no hay jugadores duplicados entre equipos
    const jugadoresEquipo1 = equipos[0].jugadores.getItems().map(ej => (ej.jugador as any as Player).id);
    const jugadoresEquipo2 = equipos[1].jugadores.getItems().map(ej => (ej.jugador as any as Player).id);

    const interseccion = jugadoresEquipo1.filter(id => jugadoresEquipo2.includes(id));
    expect(interseccion).toHaveLength(0); // No debe haber jugadores en común
  }, 30000);
});

/**
 * Helper para extraer access_token de las cookies
 */
function extractAccessToken(cookies: string[]): string {
  const accessTokenCookie = cookies.find(c => c.startsWith('access_token='));
  if (!accessTokenCookie) throw new Error('No se encontró access_token en cookies');
  
  const match = accessTokenCookie.match(/access_token=([^;]+)/);
  if (!match) throw new Error('No se pudo extraer el token');
  
  return match[1];
}

/**
 * Seed de datos mínimos para el test
 */
async function seedMinimalData(orm: MikroORM): Promise<void> {
  const em = orm.em.fork();

  // Crear o recuperar GameConfig
  let gameConfig = await em.findOne(GameConfig, { id: 1 });
  if (!gameConfig) {
    gameConfig = new GameConfig();
    gameConfig.cupoMaximoTorneos = 5;
    gameConfig.modificacionesHabilitadas = true;
    em.persist(gameConfig);
    await em.flush();
  }

  // Crear o recuperar posiciones
  const positionsData = ['Goalkeeper', 'Defender', 'Midfielder', 'Attacker'];
  const positionEntities: Position[] = [];
  
  for (const desc of positionsData) {
    let pos = await em.findOne(Position, { description: desc });
    if (!pos) {
      pos = new Position();
      pos.description = desc;
      em.persist(pos);
    }
    positionEntities.push(pos);
  }
  
  await em.flush();

  // Crear o recuperar clubes (con id_api único para tests)
  const clubData = [
    { nombre: 'TEST_Club_A', id_api: 999001 },
    { nombre: 'TEST_Club_B', id_api: 999002 },
    { nombre: 'TEST_Club_C', id_api: 999003 },
    { nombre: 'TEST_Club_D', id_api: 999004 },
    { nombre: 'TEST_Club_E', id_api: 999005 }
  ];
  
  const clubEntities: Club[] = [];
  
  for (const data of clubData) {
    let club = await em.findOne(Club, { nombre: data.nombre });
    if (!club) {
      club = new Club();
      club.nombre = data.nombre;
      club.id_api = data.id_api;
      club.logo = 'logo.png';
      em.persist(club);
    }
    clubEntities.push(club);
  }
  
  await em.flush();

  // Crear jugadores de test con apiId único
  let apiIdCounter = 888001;
  
  const jugadoresData = [
    // GOALKEEPERS (4 jugadores)
    { name: 'TEST_GK_Estrella', position: 'Goalkeeper', precio: 9000000 },
    { name: 'TEST_GK_Bueno', position: 'Goalkeeper', precio: 5000000 },
    { name: 'TEST_GK_Barato_1', position: 'Goalkeeper', precio: 1000000 },
    { name: 'TEST_GK_Barato_2', position: 'Goalkeeper', precio: 1000000 },

    // DEFENDERS (12 jugadores)
    { name: 'TEST_DEF_Estrella_1', position: 'Defender', precio: 10000000 },
    { name: 'TEST_DEF_Estrella_2', position: 'Defender', precio: 8500000 },
    { name: 'TEST_DEF_Medio_1', position: 'Defender', precio: 5000000 },
    { name: 'TEST_DEF_Medio_2', position: 'Defender', precio: 4500000 },
    { name: 'TEST_DEF_Medio_3', position: 'Defender', precio: 4000000 },
    { name: 'TEST_DEF_Medio_4', position: 'Defender', precio: 3500000 },
    { name: 'TEST_DEF_Medio_5', position: 'Defender', precio: 3000000 },
    { name: 'TEST_DEF_Medio_6', position: 'Defender', precio: 3000000 },
    { name: 'TEST_DEF_Barato_1', position: 'Defender', precio: 1000000 },
    { name: 'TEST_DEF_Barato_2', position: 'Defender', precio: 1000000 },
    { name: 'TEST_DEF_Barato_3', position: 'Defender', precio: 800000 },
    { name: 'TEST_DEF_Barato_4', position: 'Defender', precio: 800000 },

    // MIDFIELDERS (10 jugadores)
    { name: 'TEST_MID_Estrella_1', position: 'Midfielder', precio: 12000000 },
    { name: 'TEST_MID_Estrella_2', position: 'Midfielder', precio: 9000000 },
    { name: 'TEST_MID_Medio_1', position: 'Midfielder', precio: 6000000 },
    { name: 'TEST_MID_Medio_2', position: 'Midfielder', precio: 5500000 },
    { name: 'TEST_MID_Medio_3', position: 'Midfielder', precio: 5000000 },
    { name: 'TEST_MID_Medio_4', position: 'Midfielder', precio: 4500000 },
    { name: 'TEST_MID_Barato_1', position: 'Midfielder', precio: 1500000 },
    { name: 'TEST_MID_Barato_2', position: 'Midfielder', precio: 1500000 },
    { name: 'TEST_MID_Barato_3', position: 'Midfielder', precio: 1000000 },
    { name: 'TEST_MID_Barato_4', position: 'Midfielder', precio: 1000000 },

    // ATTACKERS (10 jugadores)
    { name: 'TEST_ATT_Estrella_1', position: 'Attacker', precio: 15000000 },
    { name: 'TEST_ATT_Estrella_2', position: 'Attacker', precio: 11000000 },
    { name: 'TEST_ATT_Medio_1', position: 'Attacker', precio: 7000000 },
    { name: 'TEST_ATT_Medio_2', position: 'Attacker', precio: 6500000 },
    { name: 'TEST_ATT_Medio_3', position: 'Attacker', precio: 6000000 },
    { name: 'TEST_ATT_Medio_4', position: 'Attacker', precio: 5500000 },
    { name: 'TEST_ATT_Barato_1', position: 'Attacker', precio: 1500000 },
    { name: 'TEST_ATT_Barato_2', position: 'Attacker', precio: 1500000 },
    { name: 'TEST_ATT_Barato_3', position: 'Attacker', precio: 1200000 },
    { name: 'TEST_ATT_Barato_4', position: 'Attacker', precio: 1200000 }
  ];

  for (const jugadorData of jugadoresData) {
    const existente = await em.findOne(Player, { name: jugadorData.name });
    if (!existente) {
      const player = new Player();
      player.name = jugadorData.name;
      player.apiId = apiIdCounter++;
      player.position = positionEntities.find(p => p.description === jugadorData.position)!;
      player.club = clubEntities[Math.floor(Math.random() * clubEntities.length)];
      player.precio_actual = jugadorData.precio;
      player.photo = 'player.png';
      em.persist(player);
    }
  }

  await em.flush();
}