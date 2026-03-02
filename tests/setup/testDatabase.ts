import { orm } from '../../src/shared/db/orm.js';
import { MikroORM } from '@mikro-orm/core';

export async function createTestDatabase(): Promise<MikroORM> {
  const generator = orm.getSchemaGenerator();
  await generator.updateSchema();
  
  return orm;
}

export async function closeTestDatabase(): Promise<void> {
  if (await orm.isConnected()) {
    await orm.close();
  }
}

export async function clearDatabase(orm: MikroORM): Promise<void> {
  const generator = orm.getSchemaGenerator();
  await generator.clearDatabase();
}