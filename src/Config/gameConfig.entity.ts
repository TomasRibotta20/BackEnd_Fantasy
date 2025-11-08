import { Entity, Property, ManyToOne } from '@mikro-orm/core'
import { BaseEntity } from '../shared/db/baseEntity.entity.js'
import { Jornada } from '../Fixture/Jornada.entity.js'

@Entity()
export class GameConfig extends BaseEntity {
  @ManyToOne(() => Jornada, { nullable: true })
  jornadaActiva?: Jornada

  @Property({ default: true })
  modificacionesHabilitadas: boolean = true

  @Property()
  updatedAt: Date = new Date()
}