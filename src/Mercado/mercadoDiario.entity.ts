import { Entity, Property, ManyToOne, OneToMany, Collection, Enum } from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';
import { Torneo } from '../Torneo/torneo.entity.js';
import { ItemMercado } from './itemMercado.entity.js';

export enum EstadoMercado {
  ABIERTO = 'ABIERTO',
  CERRADO = 'CERRADO',
  CANCELADO = 'CANCELADO'
}

@Entity({ tableName: 'mercado_diario' })
export class MercadoDiario extends BaseEntity {
  
  @ManyToOne(() => Torneo)
  torneo!: Torneo;
  
  @Property()
  numero_mercado!: number;
  
  @Property()
  fecha_apertura!: Date;
  
  @Property({ nullable: true })
  fecha_cierre?: Date;
  
  @Enum(() => EstadoMercado)
  estado: EstadoMercado = EstadoMercado.ABIERTO;
  
  @Property({ default: false })
  hubo_reset_pool: boolean = false;
  
  @OneToMany('ItemMercado', 'mercado', { orphanRemoval: true })
  items = new Collection<ItemMercado>(this);

  constructor() {
    super();
    this.fecha_apertura = new Date();
  }
}