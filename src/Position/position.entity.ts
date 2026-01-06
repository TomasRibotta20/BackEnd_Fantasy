import { Entity, Property, OneToMany, Collection } from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';

@Entity({ tableName: 'posiciones' })
export class Position extends BaseEntity {
  @Property({ nullable: false, unique: true })
  descripcion!: string;
}
