import { Entity, Property } from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';

@Entity()
export class Users extends BaseEntity {
  @Property({ nullable: false, unique: true })
  username!: string;

  @Property({ nullable: false, unique: true })
  email!: string;

  @Property({ nullable: false })
  password!: string;

  @Property({ default: 'user' })
  role!: string; // 'user' | 'admin'

  // Relación One-to-Many: Un usuario puede tener varios equipos
  //@OneToMany(() => Equipo, equipo => equipo.usuario, { eager: false })
  //equipos = new Collection<Equipo>(this);
}
