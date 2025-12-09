import { Entity, Property } from '@mikro-orm/core';
import { Premio } from './premio.entity.js';

@Entity({ discriminatorValue: 'saldo' })
export class Saldo extends Premio {

  @Property({ type: 'decimal', precision: 12, scale: 2 })
  monto!: number;
}