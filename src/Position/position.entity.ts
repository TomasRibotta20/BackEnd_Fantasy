import { Entity, Property, OneToMany, Collection } from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';

@Entity()
export class Position extends BaseEntity {
  @Property({ nullable: false, unique: true })
  description!: string;
}
