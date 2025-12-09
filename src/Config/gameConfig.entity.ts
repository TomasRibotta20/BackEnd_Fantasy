import { Entity, Property, ManyToOne } from '@mikro-orm/core'
import { BaseEntity } from '../shared/db/baseEntity.entity.js'
import { Jornada } from '../Fixture/Jornada.entity.js'

@Entity()
export class GameConfig extends BaseEntity {
  @ManyToOne(() => Jornada, { nullable: true })
  jornadaActiva?: Jornada

  @Property({ default: true })
  modificacionesHabilitadas: boolean = true

  @Property({ default: 5 })
  cupoMaximoTorneos: number = 5

  @Property({ default: 2 })
  dias_proteccion_clausula: number = 2

  @Property({ default: 2 })
  ratio_blindaje_clausula: number = 2

  @Property()
  updatedAt: Date = new Date()
}