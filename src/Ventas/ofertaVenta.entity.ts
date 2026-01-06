import { Entity, Property, ManyToOne, Enum } from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';
import { Equipo } from '../Equipo/equipo.entity.js';
import { EquipoJugador } from '../Equipo/equipoJugador.entity.js';

export enum EstadoOferta {
  PENDIENTE = 'PENDIENTE',
  ACEPTADA = 'ACEPTADA',
  RECHAZADA = 'RECHAZADA',
  VENCIDA = 'VENCIDA',
  CANCELADA = 'CANCELADA'
}

@Entity({ tableName: 'ofertas_venta' })
export class OfertaVenta extends BaseEntity {
  
  @ManyToOne(() => Equipo, { deleteRule: 'cascade' })
  oferente!: Equipo;
  
  @ManyToOne(() => Equipo, { deleteRule: 'cascade' })
  vendedor!: Equipo;
  
  @ManyToOne(() => EquipoJugador, { eager: true, deleteRule: 'cascade' })
  equipo_jugador!: EquipoJugador;
  
  @Property()
  monto_ofertado!: number;
  
  @Enum(() => EstadoOferta)
  estado: EstadoOferta = EstadoOferta.PENDIENTE;
  
  @Property()
  fecha_creacion!: Date;
  
  @Property()
  fecha_vencimiento!: Date;
  
  @Property({ type: 'text', nullable: true })
  mensaje_oferente?: string;
  
  @Property({ type: 'text', nullable: true })
  mensaje_respuesta?: string;

  constructor() {
    super();
    this.fecha_creacion = new Date();
    // 48 horas desde la creación
    this.fecha_vencimiento = new Date(Date.now() + 48 * 60 * 60 * 1000);
  }
}