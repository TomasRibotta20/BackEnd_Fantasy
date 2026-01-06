import { Entity, Property, ManyToOne } from '@mikro-orm/core'
import { BaseEntity } from '../shared/db/baseEntity.entity.js'
import { Jornada } from '../Fixture/Jornada.entity.js'

@Entity()
export class GameConfig extends BaseEntity {
  @ManyToOne(() => Jornada, { nullable: true })
  jornada_activa?: Jornada

  @Property({ default: true })
  modificaciones_habilitadas: boolean = true

  @Property({ default: 5 })
  cupo_maximo_torneos: number = 5

  @Property({ default: 2 })
  dias_proteccion_clausula: number = 2

  @Property({ default: 2 })
  ratio_blindaje_clausula: number = 2

  @Property({ default: 15 })
  max_jugadores_por_equipo: number = 15
  
  @Property()
  ultima_modificacion: Date = new Date()
}