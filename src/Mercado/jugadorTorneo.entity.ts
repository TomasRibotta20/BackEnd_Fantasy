import { Entity, Property, ManyToOne, Unique } from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';
import { Player } from '../Player/player.entity.js';
import { Torneo } from '../Torneo/torneo.entity.js';
import { EquipoJugador } from '../Equipo/equipoJugador.entity.js';

@Entity({ tableName: 'jugador_torneo' })
@Unique({ properties: ['jugador', 'torneo'] })
export class JugadorTorneo extends BaseEntity {
  
  @ManyToOne(() => Player)
  jugador!: Player;
  
  @ManyToOne(() => Torneo, { deleteRule: 'cascade' })
  torneo!: Torneo;
  
  @Property({ default: false })
  aparecio_en_mercado: boolean = false;
  
  @ManyToOne(() => EquipoJugador, { nullable: true , deleteRule: 'set null' })
  equipo_jugador?: EquipoJugador;
}