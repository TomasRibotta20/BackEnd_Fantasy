import { Entity, Property, ManyToOne, OneToMany, Collection } from '@mikro-orm/core'
import { BaseEntity } from '../shared/db/baseEntity.entity.js'
import { Equipo } from './equipo.entity.js'
import { Jornada } from '../Fixture/Jornada.entity.js'
import { EquipoJornadaJugador } from './equipoJornadaJugador.entity.js'
@Entity()
export class EquipoJornada extends BaseEntity {
  @ManyToOne(() => Equipo, { deleteRule: 'cascade' })
  equipo!: Equipo

  @ManyToOne(() => Jornada)
  jornada!: Jornada

  @OneToMany('EquipoJornadaJugador', 'equipo_jornada', { orphanRemoval: true })
  jugadores = new Collection<EquipoJornadaJugador>(this)

  @Property({ type: 'float', default: 0 })
  puntaje_total: number = 0

  @Property({ type: 'datetime' })
  fecha_snapshot!: Date
}