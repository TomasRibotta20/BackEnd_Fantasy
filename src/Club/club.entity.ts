import { Entity, Property } from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';

@Entity()
export class clubes extends BaseEntity {
  @Property({ nullable: false, unique: true })
  nombre!: string;
  @Property({ nullable: false, unique: true })
  id_api!: string;
}
