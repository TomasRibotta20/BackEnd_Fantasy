import { Entity, Property, ManyToOne, OneToMany, Collection } from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';
import { MercadoDiario } from './mercadoDiario.entity.js';
import { Player } from '../Player/player.entity.js';
import { MercadoPuja } from './mercadoPuja.entity.js';

@Entity({ tableName: 'item_mercado' })
export class ItemMercado extends BaseEntity {
  
  @ManyToOne('MercadoDiario', { deleteRule: 'cascade' })
  mercado!: MercadoDiario;
  
  @ManyToOne(() => Player, { eager: true })
  jugador!: Player;
  
  @ManyToOne(() => MercadoPuja, { nullable: true })
  puja_ganadora?: MercadoPuja;
  
  @Property({ default: 0 })
  cantidad_pujas: number = 0;
  
  @OneToMany('MercadoPuja', 'item', { orphanRemoval: true })
  pujas = new Collection<MercadoPuja>(this);
}