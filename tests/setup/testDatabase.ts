// tests/setup/testDatabase.ts
import { orm } from '../../src/shared/db/orm.js';
import { MikroORM } from '@mikro-orm/core';
import { Player } from '../../src/Player/player.entity.js';
import { clubes as Club } from '../../src/Club/club.entity.js';
import { Users } from '../../src/User/user.entity.js';
import { TorneoUsuario } from '../../src/Torneo/torneoUsuario.entity.js';
import { Equipo } from '../../src/Equipo/equipo.entity.js';
/**
 * Usa la conexión MySQL existente para tests
 */
export async function createTestDatabase(): Promise<MikroORM> {
  // Reutilizar la instancia ORM de producción
  return orm;
}

export async function closeTestDatabase(): Promise<void> {
  // No cerrar la conexión compartida
}

export async function clearDatabase(orm: MikroORM): Promise<void> {
  const em = orm.em.fork();
  // 1. Obtener usuarios de test
  const testUsers = await em.find(Users, { email: { $like: '%@test.com' } });
  const testUserIds = testUsers.map(u => u.id).filter((id): id is number => id !== undefined);
  
  if (testUserIds.length > 0) {
    // 2. Obtener inscripciones de test (vinculadas a usuarios de test)
    const testInscripciones = await em.find(TorneoUsuario, { usuario: { $in: testUserIds } }, {
      populate: ['equipo', 'torneo']
    });
    
    const testEquipoIds = testInscripciones
      .map(i => i.equipo?.id)
      .filter(id => id !== undefined) as number[];
    
    const testTorneoIds = testInscripciones
      .map(i => i.torneo.id)
      .filter(id => id !== undefined) as number[];
    
    // 3. Limpiar solo EquipoJugador de equipos de test
    if (testEquipoIds.length > 0) {
      await em.nativeDelete('EquipoJugador', { equipo: { $in: testEquipoIds } });
    }
    
    // 4. Limpiar solo Equipos de test
    if (testEquipoIds.length > 0) {
      await em.nativeDelete(Equipo, { id: { $in: testEquipoIds } });
    }
    
    // 5. Limpiar solo TorneoUsuario de test
    if (testInscripciones.length > 0) {
      await em.nativeDelete(TorneoUsuario, { usuario: { $in: testUserIds } });
    }
    
    // 6. Limpiar solo Torneos de test (que no tengan otras inscripciones)
    if (testTorneoIds.length > 0) {
      await em.nativeDelete('Torneo', { id: { $in: testTorneoIds } });
    }
  }
  
  // 7. Limpiar solo jugadores de test (con prefijo TEST_)
  await em.nativeDelete(Player, { name: { $like: 'TEST_%' } });
  
  // 8. Limpiar solo clubes de test
  await em.nativeDelete(Club, { nombre: { $like: 'TEST_%' } });
  
  // 9. Limpiar solo usuarios de test
  await em.nativeDelete(Users, { email: { $like: '%@test.com' } });
}
