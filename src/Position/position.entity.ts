import { Entity, Property, OneToMany, Collection } from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';
import { Player } from '../Player/player.entity.js';

@Entity()
export class Position extends BaseEntity {
  @Property({ nullable: false, unique: true })
  description!: string;

  @OneToMany(() => Player, (player) => player.position)
  players = new Collection<Player>(this);
}
