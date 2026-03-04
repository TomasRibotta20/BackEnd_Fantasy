import { Seeder } from '@mikro-orm/seeder';
import { EntityManager } from '@mikro-orm/core';
import { seedPremios } from '../Premio/premio.seed.js';

export class CreatePremiosSeeder extends Seeder {

  async run(em: EntityManager): Promise<void> {
    await seedPremios(em);
  }
}
