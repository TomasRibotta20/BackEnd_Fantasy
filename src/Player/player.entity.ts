import { Entity, Property, ManyToOne, Unique, OneToMany, Collection } from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';
import { clubes } from '../Club/club.entity.js';
import { Position } from '../Position/position.entity.js';
import { EquipoJugador } from '../Equipo/equipoJugador.entity.js';
import type { EstadisticaJugador } from '../EstadisticaJugador/estadistica-jugador.entity.js';
@Entity({ tableName: 'Jugadores' })
export class Player extends BaseEntity {
  @Property({ type: 'number' })
  @Unique()
  id_api!: number;

  @Property({ nullable: true })
  nombre?: string | null;

  @Property({ nullable: true })
  primer_nombre?: string | null;

  @Property({ nullable: true })
  apellido?: string | null;

  @Property({ type: 'number', nullable: true })
  edad?: number | null;

  @Property({ nullable: true })
  nacionalidad?: string | null;

  @Property({ nullable: true })
  altura?: string | null;

  @Property({ nullable: true })
  peso?: string | null;

  @Property({ nullable: true })
  foto?: string | null;

  @Property({ type: 'number', nullable: true })
  numero_camiseta?: number | null;
  
  @Property({ nullable: true })
  precio_actual?: number;
  
  @Property({ nullable: true })
  ultima_actualizacion_precio?: Date;

  @ManyToOne(() => clubes, { nullable: false })
  club!: clubes;

  @ManyToOne(() => Position, { nullable: true })
  posicion?: Position | null;

  @OneToMany(() => EquipoJugador, (equipoJugador) => equipoJugador.jugador, { nullable: true })
  equipos = new Collection<EquipoJugador>(this);

  @OneToMany(() => 'EstadisticaJugador', (e: EstadisticaJugador) => e.jugador)
  estadisticas = new Collection<EstadisticaJugador>(this);
}
