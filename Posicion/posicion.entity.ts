import { Entity, Property, OneToMany, Collection } from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';
import { Jugador } from '../Jugador/jugador.entity.js';

@Entity()
export class Posicion extends BaseEntity {
  @Property({ nullable: false })
  desc!: string;

  @OneToMany(() => Jugador, (jugador) => jugador.posicion)
  jugadores = new Collection<Jugador>(this);
}
