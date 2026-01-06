import { Entity, Property, OneToOne, OneToMany, Collection, Check, Formula } from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';
import { EquipoJugador } from './equipoJugador.entity.js';
import type { TorneoUsuario } from '../Torneo/torneoUsuario.entity.js';

@Entity({ tableName: 'equipos' })
@Check({ expression: 'presupuesto >= 0 AND presupuesto_bloqueado >= 0' })
export class Equipo extends BaseEntity {
  @Property({ nullable: false })
  nombre!: string;

  @Formula(alias => `(SELECT COALESCE(SUM(ej.puntaje_total), 0) FROM equipo_jornada ej WHERE ej.equipo_id = ${alias}.id)`)
  puntos?: number;

  @OneToOne({ 
    entity: 'TorneoUsuario',
    mappedBy: 'equipo',
    deleteRule: 'cascade'
  })
  torneo_usuario!: TorneoUsuario;

  @Property({ default: 90000000 })
  presupuesto: number = 90000000;

  @Property({ default: 0 })
  presupuesto_bloqueado: number = 0;

  @OneToMany(() => EquipoJugador, (equipoJugador) => equipoJugador.equipo, {
    eager: true,
    orphanRemoval: true,
  })
  jugadores = new Collection<EquipoJugador>(this);

  //helper para obtener el presupuesto disponible del equipo
  get presupuestoDisponible(): number {
    return this.presupuesto - this.presupuesto_bloqueado;
  }
}