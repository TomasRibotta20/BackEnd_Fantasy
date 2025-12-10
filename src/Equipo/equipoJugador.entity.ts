import { Entity, Property, ManyToOne, Unique, Reference } from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';
import type { Equipo } from './equipo.entity.js'; 
import { Player } from '../Player/player.entity.js';

@Entity({ tableName: 'equipos_jugadores' })
@Unique({ properties: ['equipo', 'jugador'] })
export class EquipoJugador extends BaseEntity {
  
  @ManyToOne('Equipo', { nullable: false, deleteRule: 'cascade'})
  equipo!: Reference<Equipo>;

  @ManyToOne(() => Player, { nullable: false})
  jugador!: Reference<Player>;

  @Property({ type: 'boolean', default: false })
  es_titular: boolean = false;
  
  @Property({ onCreate: () => new Date() })
  fecha_incorporacion: Date = new Date();

  @Property({ default: 0 })
  valor_clausula: number = 0;

  /**
   * Calcula la cláusula efectiva del jugador
   * Si no hay blindaje (valor_clausula = 0), retorna el precio actual
   * Si hay blindaje, retorna el máximo entre el valor fijado y el precio actual
   */
  getValorClausulaEfectiva(): number {
    const jugador = this.jugador as any;
    const precioMercado = jugador.precio_actual || 0;
    
    if (this.valor_clausula === 0) {
      return precioMercado;
    }
    
    return Math.max(this.valor_clausula, precioMercado);
  }

  /**
   * Calcula los días de protección restantes
   */
  getDiasProteccionRestantes(diasProteccion: number): number {
    const ahora = new Date();
    const diff = ahora.getTime() - this.fecha_incorporacion.getTime();
    const diasPasados = Math.floor(diff / (1000 * 60 * 60 * 24));
    return Math.max(0, diasProteccion - diasPasados);
  }

  /**
   * Verifica si el jugador está protegido
   */
  estaProtegido(diasProteccion: number): boolean {
    return this.getDiasProteccionRestantes(diasProteccion) > 0;
  }
}