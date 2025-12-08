import { Entity, Property, Enum } from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';

export enum Tier {
  ORO = 'oro',
  PLATA = 'plata',
  BRONCE = 'bronce'
}

export interface RangoPrecio {
  min: number;
  max: number | null;
  peso: number;
}

export interface ConfigJuegoAzar {
  distribucion: RangoPrecio[];
  cantidadOpciones?: number;
}

@Entity({ 
  tableName: 'premios',
  discriminatorColumn: 'tipo',
  abstract: true
})
export abstract class Premio extends BaseEntity {

  @Property({ nullable: true })
  descripcion?: string;

  @Property({ nullable: false })
  tipo!: string;

  @Enum(() => Tier)
  tier!: Tier;
}