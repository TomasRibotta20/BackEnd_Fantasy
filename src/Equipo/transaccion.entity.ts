import { Entity, Property, ManyToOne, Enum } from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';
import { Equipo } from './equipo.entity.js';
import { Player } from '../Player/player.entity.js';

export enum TipoTransaccion {
  COMPRA_MERCADO = 'COMPRA_MERCADO',
  VENTA_INSTANTANEA = 'VENTA_INSTANTANEA',
  INTERCAMBIO_ENVIADO = 'INTERCAMBIO_ENVIADO',
  INTERCAMBIO_RECIBIDO = 'INTERCAMBIO_RECIBIDO',
  PREMIO = 'PREMIO',
  PENALIZACION = 'PENALIZACION',
  CLASULA = 'CLASULA',
  COMPRA_JUGADOR = 'COMPRA_JUGADOR',     
  VENTA_JUGADOR = 'VENTA_JUGADOR'   
}

@Entity({ tableName: 'transacciones' })
export class Transaccion extends BaseEntity {
  
  @ManyToOne(() => Equipo, { deleteRule: 'cascade' })
  equipo!: Equipo;
  
  @Enum(() => TipoTransaccion)
  tipo!: TipoTransaccion;
  
  @Property()
  monto!: number; // Positivo = ingreso, Negativo = gasto
  
  @ManyToOne(() => Player, { nullable: true })
  jugador?: Player;
  
  @Property()
  fecha!: Date;
  
  @Property({ nullable: true })
  descripcion?: string;

  constructor() {
    super();
    this.fecha = new Date();
  }
}