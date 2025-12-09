import { Entity, Property } from '@mikro-orm/core';
import { ConfigJuegoAzar, Premio } from './premio.entity.js';

@Entity({ discriminatorValue: 'ruleta' })
export class Ruleta extends Premio {

  @Property({ type: 'json' })
  configuracion!: ConfigJuegoAzar;
}