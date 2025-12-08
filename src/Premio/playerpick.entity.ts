import { Entity, Property } from '@mikro-orm/core';
import { ConfigJuegoAzar, Premio } from './premio.entity.js';


@Entity({ discriminatorValue: 'pick' })
export class PlayerPick extends Premio {

  @Property({ type: 'json' })
  configuracion!: ConfigJuegoAzar;
}