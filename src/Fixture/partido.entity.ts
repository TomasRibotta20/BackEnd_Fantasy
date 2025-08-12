import { Entity, Property, ManyToOne, Unique } from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';
import { clubes } from '../Club/club.entity.js';
import { Jornada } from './Jornada.entity.js';

@Entity({ tableName: 'partidos' })
export class Partido extends BaseEntity {
  @Property({ type: 'number' })
  @Unique()
  id_api!: number; // fixture.id

  @Property({ type: 'datetime', nullable: true })
  fecha?: Date | null;

  @Property({ nullable: true })
  estado?: string | null; // status.short

  @Property({ nullable: true })
  estado_detalle?: string | null; // status.long

  @Property({ nullable: true })
  estadio?: string | null; // venue.name

  @ManyToOne(() => clubes, { nullable: false })
  local!: clubes;

  @ManyToOne(() => clubes, { nullable: false })
  visitante!: clubes;

  @ManyToOne(() => Jornada, { nullable: false })
  jornada!: Jornada;
}