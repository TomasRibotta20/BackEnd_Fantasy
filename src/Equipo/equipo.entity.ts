import { Entity, Formula, Property, OneToOne, OneToMany, Collection } from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';
import { EquipoJugador } from './equipoJugador.entity.js';
import type { TorneoUsuario } from '../Torneo/torneoUsuario.entity.js';

@Entity({ tableName: 'equipos' })
export class Equipo extends BaseEntity {
  @Property({ nullable: false })
  nombre!: string;

  @Formula(alias => `(SELECT COALESCE(SUM(ej.puntaje_total), 0) FROM equipo_jornada ej WHERE ej.equipo_id = ${alias}.id)`)
  puntos?: number;

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