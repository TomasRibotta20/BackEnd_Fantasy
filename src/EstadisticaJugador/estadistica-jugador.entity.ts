import { Entity, ManyToOne, Property } from '@mikro-orm/core';
import { Player } from '../Player/player.entity.js';
import { Partido } from '../Fixture/partido.entity.js';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';

@Entity()
export class EstadisticaJugador extends BaseEntity {
  @ManyToOne(() => Player)
  jugador!: Player;

  @ManyToOne(() => Partido)
  partido!: Partido;

  @Property({ nullable: true })
  minutos?: number;

  @Property({ nullable: true })
  posicion?: string;

  @Property({ nullable: true, type: 'float' })
  rating?: number;

  @Property({ nullable: true })
  capitan?: boolean;

  @Property({ nullable: true })
  goles?: number;

  @Property({ nullable: true })
  asistencias?: number;

  @Property({ nullable: true })
  goles_concedidos?: number;

  @Property({ nullable: true })
  atajadas?: number;

  @Property({ nullable: true })
  tarjetas_amarillas?: number;

  @Property({ nullable: true })
  tarjetas_rojas?: number;

  @Property({ nullable: true })
  porterias_a_cero?: boolean;

  @Property({ type: 'float', default: 0 })
  puntaje_total: number = 0;
}