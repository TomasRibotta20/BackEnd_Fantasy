/* eslint-disable no-console */
import 'dotenv/config';
import 'reflect-metadata';
import { orm } from '../shared/db/orm.js';

async function main() {
  console.log('Actualizando esquema (sin borrar datos)...');
  const generator = orm.getSchemaGenerator();
  await generator.updateSchema();
  await orm.close(true);
  console.log('Schema actualizado');
}

main().catch((e) => {
  console.error('Error en db:sync:', e);
  process.exit(1);
});
