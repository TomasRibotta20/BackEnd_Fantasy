import { MikroORM, Options } from '@mikro-orm/core';
import { MySqlDriver } from '@mikro-orm/mysql';
import { SqlHighlighter } from '@mikro-orm/sql-highlighter';

//    export const orm = await MikroORM.init<MySqlDriver>({
//      entities: ['dist/**/*.entity.js'],
//      entitiesTs: ['src/**/*.entity.ts'],
//      dbName: 'fantasydatabase',
//      user: 'dsw',
//      password: 'dsw',
//     host: 'localhost',
//      port: 3307,
//      driver: MySqlDriver,
//      highlighter: new SqlHighlighter(),
//      debug: true,
//      seeder: {
//        path: './dist/Seeders',
//        pathTs: './src/Seeders',
//        glob: '!(*.d).{js,ts}',
//      },
//    });

const dbConfig: Options<MySqlDriver> = {
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
  seeder: {
    path: './dist/Seeders',
    pathTs: './src/Seeders',
    glob: '!(*.d).{js,ts}',
  },
};

export default dbConfig;
export const orm = await MikroORM.init(dbConfig);

export const safeUpdateSchema = async () => {
  const generator = orm.getSchemaGenerator();
  // Crea solo lo que falta y altera columnas necesarias sin borrar tablas ni columnas
  await generator.updateSchema({
    dropTables: false,
  });
};