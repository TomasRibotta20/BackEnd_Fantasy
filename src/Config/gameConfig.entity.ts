import { Entity, Property, ManyToOne, Enum } from '@mikro-orm/core'
import { BaseEntity } from '../shared/db/baseEntity.entity.js'
import { Jornada } from '../Fixture/Jornada.entity.js'

export enum AutomationState {
  IDLE = 'IDLE',
  PREP = 'PREP',
}

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

  @Property({ default: false })
  modo_automatico: boolean = false

  @Enum({ items: () => AutomationState, default: AutomationState.IDLE })
  automation_state: AutomationState = AutomationState.IDLE

  @Property({ default: 5 })
  cron_intervalo_minutos: number = 5

  @Property({ type: 'float', default: 24 })
  mercado_duracion_horas: number = 24

  @Property({ type: 'datetime', nullable: true })
  ultimo_procesamiento_auto?: Date

  @Property({ type: 'datetime', nullable: true })
  fecha_referencia_real?: Date

  @Property({ type: 'datetime', nullable: true })
  fecha_referencia_historica?: Date
}