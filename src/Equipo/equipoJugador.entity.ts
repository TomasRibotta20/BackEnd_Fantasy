import { Entity, Property, ManyToOne, Unique, Reference } from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';
import type { Equipo } from './equipo.entity.js'; // CAMBIO: Usar 'import type'
import { Player } from '../Player/player.entity.js';

@Entity({ tableName: 'equipos_jugadores' })
@Unique({ properties: ['equipo', 'jugador'] })
export class EquipoJugador extends BaseEntity {
  
  @ManyToOne('Equipo', { nullable: false})
  equipo!: Reference<Equipo>;

  @ManyToOne(() => Player, { nullable: false})
  jugador!: Reference<Player>;

  @Property({ type: 'boolean', default: false })
  es_titular: boolean = false;

  
}