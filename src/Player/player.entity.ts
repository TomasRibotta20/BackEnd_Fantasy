import { Entity, Property, ManyToOne, Unique } from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';
import { clubes } from '../Club/club.entity.js';
import { Position } from '../Position/position.entity.js';

@Entity({ tableName: 'player' })
export class Player extends BaseEntity {
  @Property({ type: 'number' })
  @Unique()
  apiId!: number;

  @Property({ nullable: true }) name?: string | null;
  @Property({ nullable: true }) firstname?: string | null;
  @Property({ nullable: true }) lastname?: string | null;
  @Property({ type: 'number', nullable: true }) age?: number | null;
  @Property({ nullable: true }) nationality?: string | null;
  @Property({ nullable: true }) height?: string | null;
  @Property({ nullable: true }) weight?: string | null;
  @Property({ nullable: true }) photo?: string | null;
  @Property({ type: 'number', nullable: true }) jerseyNumber?: number | null;

  @ManyToOne(() => clubes, { nullable: false })
  club!: clubes;

  @ManyToOne(() => Position, { nullable: true })
  position?: Position | null;
}