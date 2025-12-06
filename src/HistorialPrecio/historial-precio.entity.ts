import { Entity, Property, ManyToOne } from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';
import { Player } from '../Player/player.entity.js';
import { Jornada } from '../Fixture/Jornada.entity.js';

export enum MotivoActualizacionPrecio {
  INICIAL = 'INICIAL',
  RENDIMIENTO = 'RENDIMIENTO',
  MANUAL = 'MANUAL'
}

@Entity()
export class HistorialPrecio extends BaseEntity {
  @ManyToOne(() => Player, { eager: false })
  jugador!: Player;

  @Property()
  precio!: number;

  @Property()
  fecha!: Date;

  @ManyToOne(() => Jornada, { nullable: true })
  jornada?: Jornada;

  @Property()
  motivo!: MotivoActualizacionPrecio;

  @Property({ nullable: true })
  observaciones?: string;

  constructor() {
    super();
    this.fecha = new Date();
  }
}