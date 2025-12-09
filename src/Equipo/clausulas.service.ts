import { EntityManager } from '@mikro-orm/core';
import { orm } from '../shared/db/orm.js';
import { EquipoJugador } from './equipoJugador.entity.js';
import { Equipo } from './equipo.entity.js';
import { Player } from '../Player/player.entity.js';
import { GameConfig } from '../Config/gameConfig.entity.js';
import { Transaccion, TipoTransaccion } from './transaccion.entity.js';
import { ErrorFactory } from '../shared/errors/errors.factory.js';
import { sendClausulaEjecutadaEmail, sendClausulaExitosaEmail } from '../shared/mailer/emailTemplates.js';

const JUGADORES_MAXIMOS_POR_EQUIPO = 15;
export interface BlindajeResultante {
  jugador: {
    id: number;
    nombre: string;
    precio_actual: number;
  };
  costo_presupuesto: number;
  incremento_clausula: number;
  clausula_anterior: number;
  clausula_nueva: number;
  presupuesto_restante: number;
}

/**
 * Aumenta la cláusula de un jugador propio gastando presupuesto
 */
export async function blindarJugador(
  equipoId: number,
  jugadorId: number,
  montoIncremento: number,
  userId: number
): Promise<BlindajeResultante> {
  
  return await orm.em.transactional(async (em) => {
    
    // 1. Cargar gameConfig
    const gameConfig = await em.findOne(GameConfig, 1);
    if (!gameConfig) {
      throw ErrorFactory.internal('Configuración del juego no encontrada');
    }
    
    // 2. Buscar relación equipo-jugador
    const equipoJugador = await em.findOne(
      EquipoJugador,
      { equipo: equipoId, jugador: jugadorId },
      { populate: ['equipo.torneoUsuario.usuario', 'jugador'] }
    );
    
    if (!equipoJugador) {
      throw ErrorFactory.notFound('El jugador no pertenece a tu equipo');
    }
    
    const equipo = equipoJugador.equipo as any;
    const jugador = equipoJugador.jugador as any;
    
    // 3. Verificar propiedad
    if (equipo.torneoUsuario.usuario.id !== userId) {
      throw ErrorFactory.forbidden('No tienes permisos para blindar jugadores de este equipo');
    }
    
    // 4. Validar monto positivo
    if (montoIncremento <= 0) {
      throw ErrorFactory.badRequest('El monto debe ser positivo');
    }
    
    // 5. Calcular costo en presupuesto
    const costoPresupuesto = Math.ceil(montoIncremento / gameConfig.ratio_blindaje_clausula);
    
    // 6. Verificar fondos disponibles
    if (equipo.presupuestoDisponible < costoPresupuesto) {
      throw ErrorFactory.badRequest(
        `Presupuesto insuficiente. Necesitas $${costoPresupuesto.toLocaleString()} pero solo tienes $${equipo.presupuestoDisponible.toLocaleString()}`
      );
    }
    
    const precioActual = jugador.precio_actual || 0;
    const clausulaAnterior = equipoJugador.getValorClausulaEfectiva();
    
    // 7. Aplicar cambios
    equipo.presupuesto -= costoPresupuesto;
    
    // Calcular nueva cláusula absoluta
    const nuevaClausula = clausulaAnterior + montoIncremento;
    equipoJugador.valor_clausula = Math.max(nuevaClausula, precioActual);
    
    // 8. Crear transacción
    const transaccion = em.create(Transaccion, {
      equipo,
      tipo: TipoTransaccion.GASTO_BLINDAJE,
      monto: -costoPresupuesto,
      jugador,
      fecha: new Date(),
      descripcion: `Blindaje de ${jugador.name}: +$${montoIncremento.toLocaleString()} a la cláusula (Costo: $${costoPresupuesto.toLocaleString()})`
    });
    
    em.persist(transaccion);
    await em.flush();
    
    return {
      jugador: {
        id: jugador.id!,
        nombre: jugador.name || 'Desconocido',
        precio_actual: precioActual
      },
      costo_presupuesto: costoPresupuesto,
      incremento_clausula: montoIncremento,
      clausula_anterior: clausulaAnterior,
      clausula_nueva: equipoJugador.valor_clausula,
      presupuesto_restante: equipo.presupuesto
    };
  });
}

export interface ClausulaResultado {
  mensaje: string;
  jugador: {
    id: number;
    nombre: string;
    posicion: string;
    precio_mercado: number;
    clausula_pagada: number;
  };
  equipo_anterior: {
    id: number;
    nombre: string;
    usuario_email: string;
  };
  presupuesto_restante: number;
  protegido_hasta: Date;
}

/**
 * Ejecuta la cláusula de un jugador rival, transfiriéndolo a tu equipo
 */
export async function ejecutarClausula(
  compradorEquipoId: number,
  jugadorId: number,
  compradorUserId: number
): Promise<ClausulaResultado> {
  
  return await orm.em.transactional(async (em) => {
    
    // 1. Cargar gameConfig
    const gameConfig = await em.findOne(GameConfig, 1);
    if (!gameConfig) {
      throw ErrorFactory.internal('Configuración del juego no encontrada');
    }
    
    // 2. Cargar equipo comprador primero para saber su torneo
    const equipoComprador = await em.findOne(
      Equipo,
      { id: compradorEquipoId },
      { populate: ['torneoUsuario.usuario', 'torneoUsuario.torneo', 'jugadores'] }
    );
    
    if (!equipoComprador) {
      throw ErrorFactory.notFound('Tu equipo no existe');
    }
    
    // 3. Validar propiedad del comprador
    if (equipoComprador.torneoUsuario.usuario.id !== compradorUserId) {
      throw ErrorFactory.forbidden('No tienes permisos para ejecutar cláusulas con este equipo');
    }
    
    const torneoId = equipoComprador.torneoUsuario.torneo.id;
    
    // 4. Buscar al jugador SOLO en equipos del mismo torneo
    const equipoJugadorVendedor = await em.findOne(
      EquipoJugador,
      { 
        jugador: jugadorId,
        equipo: {
          torneoUsuario: {
            torneo: torneoId
          }
        }
      },
      { 
        populate: [
          'equipo.torneoUsuario.usuario',
          'equipo.torneoUsuario.torneo',
          'jugador.position'
        ] 
      }
    );
    
    if (!equipoJugadorVendedor) {
      throw ErrorFactory.notFound('El jugador no está disponible en este torneo o no pertenece a ningún equipo');
    }
    
    const equipoVendedor = equipoJugadorVendedor.equipo as any;
    const jugador = equipoJugadorVendedor.jugador as any;
    const posicion = jugador.position;
    
    if (!posicion) {
      throw ErrorFactory.badRequest('El jugador no tiene posición definida');
    }
    
    // 5. NO PUEDES COMPRAR TU PROPIO JUGADOR
    if (equipoComprador.id === equipoVendedor.id) {
      throw ErrorFactory.badRequest('No puedes ejecutar la cláusula de tu propio jugador');
    }
    
    // 6. CHECK ESCUDO DE PROTECCIÓN
    const diasRestantes = equipoJugadorVendedor.getDiasProteccionRestantes(
      gameConfig.dias_proteccion_clausula
    );
    
    if (diasRestantes > 0) {
      throw ErrorFactory.badRequest(
        `Este jugador está protegido por ${diasRestantes} día(s) más`
      );
    }
    
    // 7. CALCULAR PRECIO FINAL (cláusula efectiva)
    const precioMercado = jugador.precio_actual || 0;
    const precioFinal = equipoJugadorVendedor.getValorClausulaEfectiva();
    
    // 8. CHECK DE FONDOS
    if (equipoComprador.presupuestoDisponible < precioFinal) {
      throw ErrorFactory.badRequest(
        `Presupuesto insuficiente. Necesitas $${precioFinal.toLocaleString()} pero tienes $${equipoComprador.presupuestoDisponible.toLocaleString()}`
      );
    }
    
    // 9. CHECK DE CUPO TOTAL 
    const jugadoresComprador = await em.count(EquipoJugador, { 
      equipo: compradorEquipoId 
    });
    
    if (jugadoresComprador >= JUGADORES_MAXIMOS_POR_EQUIPO) {
      throw ErrorFactory.badRequest(`Tu equipo está completo (${JUGADORES_MAXIMOS_POR_EQUIPO} jugadores)`);
    }
    
    
    // 10. EJECUCIÓN ATÓMICA
    
    // a) Movimiento de dinero
    equipoComprador.presupuesto -= precioFinal;
    equipoVendedor.presupuesto += precioFinal;
    
    // b) Transferencia del jugador
    equipoJugadorVendedor.equipo = equipoComprador as any;
    equipoJugadorVendedor.fecha_incorporacion = new Date();
    equipoJugadorVendedor.valor_clausula = 0;
    equipoJugadorVendedor.es_titular = false;
    
    // c) Transacciones
    const transaccionCompra = em.create(Transaccion, {
      equipo: equipoComprador,
      tipo: TipoTransaccion.PAGO_CLAUSULA,
      monto: -precioFinal,
      jugador,
      fecha: new Date(),
      descripcion: `Ejecución de cláusula: ${jugador.name} (Precio: $${precioFinal.toLocaleString()})`
    });
    
    const transaccionVenta = em.create(Transaccion, {
      equipo: equipoVendedor,
      tipo: TipoTransaccion.COBRO_CLAUSULA,
      monto: precioFinal,
      jugador,
      fecha: new Date(),
      descripcion: `Cláusula ejecutada: ${jugador.name} vendido a ${equipoComprador.nombre}`
    });
    
    em.persist(transaccionCompra);
    em.persist(transaccionVenta);
    
    await em.flush();
    
    // d) Enviar emails
    const vendedorEmail = equipoVendedor.torneoUsuario.usuario.email;
    const vendedorNombre = equipoVendedor.torneoUsuario.usuario.username;
    const compradorEmail = equipoComprador.torneoUsuario.usuario.email;
    const compradorNombre = equipoComprador.torneoUsuario.usuario.username;
    const torneoNombre = equipoComprador.torneoUsuario.torneo.nombre;
    
    const fechaProteccionHasta = new Date(
      Date.now() + gameConfig.dias_proteccion_clausula * 86400000
    );
    
    // Email al vendedor (le robaron el jugador)
    await sendClausulaEjecutadaEmail(
      vendedorEmail,
      vendedorNombre,
      jugador.name || 'Desconocido',
      posicion.description,
      precioFinal,
      equipoComprador.nombre,
      compradorNombre,
      torneoNombre,
      equipoVendedor.presupuesto
    );
    
    // Email al comprador (clausulazo exitoso)
    await sendClausulaExitosaEmail(
      compradorEmail,
      compradorNombre,
      jugador.name || 'Desconocido',
      posicion.description,
      precioFinal,
      equipoVendedor.nombre,
      vendedorNombre,
      torneoNombre,
      equipoComprador.presupuesto,
      fechaProteccionHasta
    );
    
    return {
      mensaje: `¡Clausulazo exitoso! ${jugador.name} ahora es parte de tu equipo`,
      jugador: {
        id: jugador.id!,
        nombre: jugador.name || 'Desconocido',
        posicion: posicion.description,
        precio_mercado: precioMercado,
        clausula_pagada: precioFinal
      },
      equipo_anterior: {
        id: equipoVendedor.id!,
        nombre: equipoVendedor.nombre,
        usuario_email: vendedorEmail
      },
      presupuesto_restante: equipoComprador.presupuesto,
      protegido_hasta: fechaProteccionHasta
    };
  });
}