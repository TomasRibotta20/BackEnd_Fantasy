import { orm } from '../shared/db/orm.js';
import { EquipoJugador } from './equipoJugador.entity.js';
import { Equipo } from './equipo.entity.js';
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
    const gameConfig = await em.findOne(GameConfig, 1);
    if (!gameConfig) {
      throw ErrorFactory.internal('Configuración del juego no encontrada');
    }
    const equipoJugador = await em.findOne(
      EquipoJugador,
      { equipo: equipoId, jugador: jugadorId },
      { populate: ['equipo.torneo_usuario.usuario', 'jugador'] }
    );
    
    if (!equipoJugador) {
      throw ErrorFactory.notFound('El jugador no pertenece a tu equipo');
    }
    
    const equipo = equipoJugador.equipo as any;
    const jugador = equipoJugador.jugador as any;
    
    if (equipo.torneoUsuario.usuario.id !== userId) {
      throw ErrorFactory.forbidden('No tienes permisos para blindar jugadores de este equipo');
    }
    const costoPresupuesto = Math.ceil(montoIncremento / gameConfig.ratio_blindaje_clausula);
    if (equipo.presupuestoDisponible < costoPresupuesto) {
      throw ErrorFactory.badRequest(
        `Presupuesto insuficiente. Necesitas $${costoPresupuesto.toLocaleString()} pero solo tienes $${equipo.presupuestoDisponible.toLocaleString()}`
      );
    }
    
    const precioActual = jugador.precio_actual || 0;
    const clausulaAnterior = equipoJugador.getValorClausulaEfectiva();

    equipo.presupuesto -= costoPresupuesto;

    const nuevaClausula = clausulaAnterior + montoIncremento;
    equipoJugador.valor_clausula = Math.max(nuevaClausula, precioActual);
    
    const transaccion = em.create(Transaccion, {
      equipo,
      tipo: TipoTransaccion.GASTO_BLINDAJE,
      monto: -costoPresupuesto,
      jugador,
      fecha: new Date(),
      descripcion: `Blindaje de ${jugador.name}: +$${montoIncremento.toLocaleString()} a la cláusula (Costo: $${costoPresupuesto.toLocaleString()})`
    });
    em.persist(transaccion);
    
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
    
    const gameConfig = await em.findOne(GameConfig, 1);
    if (!gameConfig) {
      throw ErrorFactory.internal('Configuración del juego no encontrada');
    }
    const equipoComprador = await em.findOne(
      Equipo,
      { id: compradorEquipoId },
      { populate: ['torneo_usuario.usuario', 'torneo_usuario.torneo', 'jugadores'] }
    );
    
    if (!equipoComprador) {
      throw ErrorFactory.notFound('Tu equipo no existe');
    }
    
    if (equipoComprador.torneo_usuario.usuario.id !== compradorUserId) {
      throw ErrorFactory.forbidden('No tienes permisos para ejecutar cláusulas con este equipo');
    }
    
    const torneoId = equipoComprador.torneo_usuario.torneo.id;
    const equipoJugadorVendedor = await em.findOne(
      EquipoJugador,
      { 
        jugador: jugadorId,
        equipo: {
          torneo_usuario: {
            torneo: torneoId
          }
        }
      },
      { 
        populate: [
          'equipo.torneo_usuario.usuario',
          'equipo.torneo_usuario.torneo',
          'jugador.posicion'
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
    if (equipoComprador.id === equipoVendedor.id) {
      throw ErrorFactory.badRequest('No puedes ejecutar la cláusula de tu propio jugador');
    }
    const diasRestantes = equipoJugadorVendedor.getDiasProteccionRestantes(
      gameConfig.dias_proteccion_clausula
    );
    if (diasRestantes > 0) {
      throw ErrorFactory.badRequest(
        `Este jugador está protegido por ${diasRestantes} día(s) más`
      );
    }

    const precioMercado = jugador.precio_actual || 0;
    const precioFinal = equipoJugadorVendedor.getValorClausulaEfectiva();
    
    if (equipoComprador.presupuestoDisponible < precioFinal) {
      throw ErrorFactory.badRequest(
        `Presupuesto insuficiente. Necesitas $${precioFinal.toLocaleString()} pero tienes $${equipoComprador.presupuestoDisponible.toLocaleString()}`
      );
    }
    const jugadoresComprador = await em.count(EquipoJugador, { 
      equipo: compradorEquipoId 
    });
    
    if (jugadoresComprador >= JUGADORES_MAXIMOS_POR_EQUIPO) {
      throw ErrorFactory.badRequest(`Tu equipo está completo (${JUGADORES_MAXIMOS_POR_EQUIPO} jugadores)`);
    }

    equipoComprador.presupuesto -= precioFinal;
    equipoVendedor.presupuesto += precioFinal;
    
    equipoJugadorVendedor.equipo = equipoComprador as any;
    equipoJugadorVendedor.fecha_incorporacion = new Date();
    equipoJugadorVendedor.valor_clausula = 0;
    equipoJugadorVendedor.es_titular = false;
    
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
    
    const vendedorEmail = equipoVendedor.torneoUsuario.usuario.email;
    const vendedorNombre = equipoVendedor.torneoUsuario.usuario.username;
    const compradorEmail = equipoComprador.torneo_usuario.usuario.email;
    const compradorNombre = equipoComprador.torneo_usuario.usuario.username;
    const torneoNombre = equipoComprador.torneo_usuario.torneo.nombre;
    
    const fechaProteccionHasta = new Date(
      Date.now() + gameConfig.dias_proteccion_clausula * 86400000
    );
    
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