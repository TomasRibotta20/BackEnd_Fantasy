import { Entity, Property } from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';

@Entity({ tableName: 'jornadas' })
export class Jornada extends BaseEntity {
  @Property({ nullable: false, unique: true })
  nombre!: string; // ej: "2nd Phase - 1"

  @Property({ type: 'number', nullable: false })
  temporada!: number;

  @Property({ nullable: true })
  etapa?: string | null; // "2nd Phase"

  @Property({ type: 'number', nullable: true })
  liga_id?: number | null; // 128

  @Property({ type: 'datetime', nullable: true })
  fecha_inicio?: Date | null;

  @Property({ type: 'datetime', nullable: true })
  fecha_fin?: Date | null;
}