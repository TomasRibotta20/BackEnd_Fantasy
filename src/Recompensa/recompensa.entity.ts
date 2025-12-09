import { Entity, ManyToOne, Property, Unique, Enum } from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';
import { TorneoUsuario } from '../Torneo/torneoUsuario.entity.js';
import { Jornada } from '../Fixture/Jornada.entity.js';
import { Premio } from '../Premio/premio.entity.js';
import { Player } from '../Player/player.entity.js';

@Entity()
@Unique({ properties: ['torneoUsuario', 'jornada'] }) 
export class Recompensa extends BaseEntity {

  @Property()
  posicionJornada!: number;

  @Property({ nullable: true })
  fecha_reclamo?: Date;

  @ManyToOne(() => TorneoUsuario, { deleteRule: 'cascade' })
  torneoUsuario!: TorneoUsuario;

  @ManyToOne(() => Jornada, { deleteRule: 'cascade' })
  jornada!: Jornada;

  @ManyToOne(() => Premio, { nullable: true })
  premioConfiguracion?: Premio;

  @Property({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  monto?: number;

  @Property({ nullable: true })
  montoCompensacion?: number;

  @ManyToOne(() => Player, { nullable: true })
  jugador?: Player;

  @Property({ type: 'json', nullable: true })
  opcionesPickDisponibles?: number[];

  @Property({ nullable: true })
  fechaExpiracionPick?: Date;
}