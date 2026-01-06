import { Entity, Property, OneToMany, Collection } from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';
import type { TorneoUsuario } from '../Torneo/torneoUsuario.entity.js';


@Entity({ tableName: 'usuarios' })
export class Users extends BaseEntity {
  @Property({ nullable: false, unique: true })
  username!: string;

  @Property({ nullable: false, unique: true })
  email!: string;

  @Property({ nullable: false })
  password!: string;

  @Property({ default: 'user' })
  rol!: string; // 'user' | 'admin'

  @Property({ nullable: true })
  refreshToken?: string;

  @Property({ nullable: true })
  resetToken?: string | null;

  @OneToMany(() => 'TorneoUsuario', (tu: TorneoUsuario) => tu.usuario)
  torneos = new Collection<TorneoUsuario>(this);
}