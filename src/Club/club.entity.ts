import { Entity, Property } from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';

@Entity({ tableName: 'clubes' })
export class clubes extends BaseEntity {
  @Property({ nullable: false, unique: true })
  nombre!: string;

  @Property({ type: 'number', nullable: false, unique: true })
  id_api!: number;

  @Property({ nullable: true })
  codigo?: string | null;

  @Property({ nullable: true })
  logo?: string | null;

  @Property({ nullable: true })
  pais?: string | null;

  @Property({ type: 'number', nullable: true })
  fundado?: number | null;

  @Property({ nullable: true })
  estadio_nombre?: string | null;

  @Property({ nullable: true })
  estadio_ciudad?: string | null;

  @Property({ type: 'number', nullable: true })
  estadio_capacidad?: number | null;

  @Property({ nullable: true })
  estadio_imagen?: string | null;
}
