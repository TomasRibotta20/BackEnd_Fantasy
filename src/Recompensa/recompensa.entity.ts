import { Entity, ManyToOne, Property, Unique, Enum } from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';
import { TorneoUsuario } from '../Torneo/torneoUsuario.entity.js';
import { Jornada } from '../Fixture/Jornada.entity.js';
import { Premio } from '../Premio/premio.entity.js';
import { Player } from '../Player/player.entity.js';

@Entity()
@Unique({ properties: ['torneo_usuario', 'jornada'] }) 
export class Recompensa extends BaseEntity {

  @Property()
  posicion_jornada!: number;

  @Property({ nullable: true })
  fecha_reclamo?: Date;

  @ManyToOne(() => TorneoUsuario, { deleteRule: 'cascade' })
  torneo_usuario!: TorneoUsuario;

  @ManyToOne(() => Jornada, { deleteRule: 'cascade' })
  jornada!: Jornada;

  @ManyToOne(() => Premio, { nullable: true })
  premio_configuracion?: Premio;

  @Property({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  monto?: number;

  @Property({ nullable: true })
  monto_compensacion?: number;

  @ManyToOne(() => Player, { nullable: true })
  jugador?: Player;

  @Property({ type: 'json', nullable: true })
  opciones_pick_disponibles?: number[];

  @Property({ nullable: true })
  fecha_expiracion_pick?: Date;
}