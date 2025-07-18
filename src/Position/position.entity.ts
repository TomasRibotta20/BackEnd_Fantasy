import { Entity, Property } from '@mikro-orm/core'; //, OneToMany, Collection
import { BaseEntity } from '../shared/db/baseEntity.entity.js';
//import { Player } from '../Jugador/player.entity.js';

@Entity()
export class Position extends BaseEntity {
  @Property({ nullable: false, unique: true })
  description!: string;

  //@OneToMany(() => Player, (player) => player.position)
  //players = new Collection<Player>(this);
}
