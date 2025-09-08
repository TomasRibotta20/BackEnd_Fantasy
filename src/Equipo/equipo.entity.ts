// filepath: d:\Documents\Desktop\Proyecto_Fantasy\BackEnd_Fantasy\src\Equipo\equipo.entity.ts
import { Entity, Property, ManyToOne, OneToMany, Collection } from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';
import { Users } from '../User/user.entity.js';
import { Player } from '../Player/player.entity.js';

@Entity()
export class Equipo extends BaseEntity {
  @Property({ nullable: false })
  nombre!: string;

  @ManyToOne(() => Users, { nullable: false })
  usuario!: Users;

  @OneToMany(() => Player, (player) => player.equipo, {
    eager: true, // Carga automáticamente los jugadores al consultar un equipo
  })
  jugadores = new Collection<Player>(this);
}