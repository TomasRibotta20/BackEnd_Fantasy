import { Entity, Property, ManyToOne, ManyToMany, Collection } from '@mikro-orm/core'
import { BaseEntity } from '../shared/db/baseEntity.entity.js'
import { Equipo } from './equipo.entity.js'
import { Jornada } from '../Fixture/Jornada.entity.js'
import { Player } from '../Player/player.entity.js'

@Entity()
export class EquipoJornada extends BaseEntity {
  @ManyToOne(() => Equipo)
  equipo!: Equipo

  @ManyToOne(() => Jornada)
  jornada!: Jornada

  @ManyToMany(() => Player)
  jugadores = new Collection<Player>(this)

  @Property({ type: 'float', default: 0 })
  puntajeTotal: number = 0

  @Property({ type: 'datetime' })
  fechaSnapshot!: Date
}