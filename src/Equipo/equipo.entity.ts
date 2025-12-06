import { Entity, Property, OneToOne, OneToMany, Collection } from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';
import { EquipoJugador } from './equipoJugador.entity.js';
import type { TorneoUsuario } from '../Torneo/torneoUsuario.entity.js';

@Entity({ tableName: 'equipos' })
export class Equipo extends BaseEntity {
  @Property({ nullable: false })
  nombre!: string;

  @Property({ default: 0 })
  puntos: number = 0;

  @OneToOne({ 
    entity: 'TorneoUsuario',
    mappedBy: 'equipo'
  })
  torneoUsuario!: TorneoUsuario;

  @Property({ default: 90000000 })
  presupuesto: number = 90000000;

  // La relación ahora es con la tabla intermedia
  @OneToMany(() => EquipoJugador, (equipoJugador) => equipoJugador.equipo, {
    eager: true,
    orphanRemoval: true,
  })
  jugadores = new Collection<EquipoJugador>(this);

  
}