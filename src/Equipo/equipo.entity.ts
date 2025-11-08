import { Entity, Property, ManyToOne, OneToMany, Collection, Reference } from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';
import { Users } from '../User/user.entity.js';
import { EquipoJugador } from './equipoJugador.entity.js';

@Entity({ tableName: 'equipos' })
export class Equipo extends BaseEntity {
  @Property({ nullable: false })
  nombre!: string;

  // CORRECCIÓN: Usar Reference.create() para la relación con el usuario
  // Esto es una buena práctica para evitar cargar el objeto User innecesariamente
  @ManyToOne(() => Users, { nullable: false, unique: true })
  usuario!: Reference<Users>;

  // La relación ahora es con la tabla intermedia
  @OneToMany(() => EquipoJugador, (equipoJugador) => equipoJugador.equipo, {
    eager: true,
    orphanRemoval: true,
  })
  jugadores = new Collection<EquipoJugador>(this);

  
}