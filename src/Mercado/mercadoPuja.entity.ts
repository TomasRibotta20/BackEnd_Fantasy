import { Entity, Property, ManyToOne, Enum } from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';
import { ItemMercado } from './itemMercado.entity.js';
import { Equipo } from '../Equipo/equipo.entity.js';

export enum EstadoPuja {
  PENDIENTE = 'PENDIENTE',
  GANADA = 'GANADA',
  PERDIDA = 'PERDIDA',
  CANCELADA = 'CANCELADA',
  RECHAZADA_CUPO = 'RECHAZADA_CUPO'
}

@Entity({ tableName: 'mercado_puja' })
export class MercadoPuja extends BaseEntity {
  
  @ManyToOne('ItemMercado', { deleteRule: 'cascade' })
  item!: any;
  
  @ManyToOne(() => Equipo, { deleteRule: 'cascade' })
  equipo!: Equipo;
  
  @Property()
  monto!: number;
  
  @Property()
  precio_referencia!: number;
  
  @Property()
  fecha_oferta!: Date;
  
  @Enum(() => EstadoPuja)
  estado: EstadoPuja = EstadoPuja.PENDIENTE;
  
  @Property({ nullable: true })
  observaciones?: string;

  constructor() {
    super();
    this.fecha_oferta = new Date();
  }
}