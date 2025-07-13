// Importa MikroORM y también el driver específico que vas a usar
import { MikroORM } from '@mikro-orm/core';
import { MySqlDriver } from '@mikro-orm/mysql'; // ¡Importante!
import { SqlHighlighter } from '@mikro-orm/sql-highlighter';

export const orm = await MikroORM.init<MySqlDriver>({
  // <--- ¡Aquí se especifica el driver!
  entities: ['dist/**/*.entity.js'],
  entitiesTs: ['src/**/*.entity.ts'],
  dbName: 'fantasydatabase',
  user: 'dsw',
  password: 'dsw',
  host: 'localhost',
  port: 3307,
  driver: MySqlDriver,
  highlighter: new SqlHighlighter(),
  debug: true,
  schemaGenerator: {
    //nunca en producción
    disableForeignKeys: true,
    createForeignKeyConstraints: true,
    ignoreSchema: [],
  },
});

export const syncSchema = async () => {
  const generator = orm.getSchemaGenerator();
  /*   
  await generator.dropSchema()
  await generator.createSchema()
  */
  await generator.updateSchema();
};
