import { Entity, ManyToOne, OneToOne, Property, Unique } from '@mikro-orm/core';
import { Users } from '../User/user.entity.js';
import { Torneo } from './torneo.entity.js';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';
import { Equipo } from '../Equipo/equipo.entity.js';

@Entity({ tableName: 'torneo_usuario' })
@Unique({ properties: ['usuario', 'torneo'] }) 
export class TorneoUsuario extends BaseEntity {
  
  @Property()
  rol!: string;

  @Property({ onCreate: () => new Date() })
  fecha_inscripcion = new Date();

  @ManyToOne(() => Users, { deleteRule: 'cascade' })
  usuario!: Users;

  @ManyToOne(() => Torneo, { deleteRule: 'cascade'})
  torneo!: Torneo;
  
  @OneToOne(() => Equipo, { 
    owner: true,
    nullable: true, 
    deleteRule: 'cascade'
  })
  equipo?: Equipo;

  @Property({ default: false })
  expulsado: boolean = false;
}