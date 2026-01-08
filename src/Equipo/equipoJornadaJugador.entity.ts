// src/Equipo/equipoJornadaJugador.entity.ts
import { Entity, Property, ManyToOne } from '@mikro-orm/core'
import { BaseEntity } from '../shared/db/baseEntity.entity.js'
import { EquipoJornada } from './equipoJornada.entity.js'
import { Player } from '../Player/player.entity.js'

@Entity({ tableName: 'equipo_jornada_jugadores' })
export class EquipoJornadaJugador extends BaseEntity {
  @ManyToOne(() => EquipoJornada, { deleteRule: 'cascade' })
  equipo_jornada!: EquipoJornada

  @ManyToOne(() => Player, { deleteRule: 'cascade' })
  jugador!: Player

  @Property({ default: false })
  es_titular: boolean = false

}