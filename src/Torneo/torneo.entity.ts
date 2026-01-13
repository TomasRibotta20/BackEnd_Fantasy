import { Entity, Property, Unique, OneToMany, Collection, Formula, Enum } from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';
import type { TorneoUsuario } from './torneoUsuario.entity.js';

export enum EstadoTorneo {
  ESPERA = 'EN_ESPERA',
  ACTIVO = 'ACTIVO'
}

@Entity({ tableName: 'torneos' })
export class Torneo extends BaseEntity {
  @Property({ nullable: false })
  nombre!: string

  @Property({ nullable: false })
  @Unique()
  codigo_acceso!: string

  @Property({ nullable: true })
  descripcion!: string

  @OneToMany(() => 'TorneoUsuario', (u: TorneoUsuario) => u.torneo)
  inscripciones = new Collection<TorneoUsuario>(this);

  @Formula(alias => `(SELECT COUNT(*) FROM torneo_usuario tu WHERE tu.torneo_id = ${alias}.id and tu.expulsado = false)`)
  cantidad_participantes?: number;

  @Property({ onCreate: () => new Date() })
  fecha_creacion = new Date();

  @Property({ nullable: false })
  cupo_maximo!: number;

  @Enum({ items: () => EstadoTorneo, default: EstadoTorneo.ESPERA })
  estado = EstadoTorneo.ESPERA;
}