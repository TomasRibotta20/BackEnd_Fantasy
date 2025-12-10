import { EntityManager } from '@mikro-orm/core';
import { orm } from '../shared/db/orm.js';
import { OfertaVenta, EstadoOferta } from './ofertaVenta.entity.js';
import { Equipo } from '../Equipo/equipo.entity.js';
import { EquipoJugador } from '../Equipo/equipoJugador.entity.js';
import { Transaccion, TipoTransaccion } from '../Equipo/transaccion.entity.js';
import { ErrorFactory } from '../shared/errors/errors.factory.js';
import { sendOfertaRecibidaEmail, sendOfertaAceptadaEmail, sendOfertaRechazadaEmail, sendOfertaVencidaEmail } from '../shared/mailer/emailTemplates.js';

const MAXIMO_JUGADORES_EQUIPO = 15;

/**
 * Crear o actualizar una oferta de venta
 */
export async function crearOferta(
  userId: number,
  equipoJugadorId: number,
  montoOfertado: number,
  mensajeOferente?: string,
  em?: EntityManager
) {
  const entityManager = em || orm.em.fork();

  const equipoJugador = await entityManager.findOne(
    EquipoJugador,
    { id: equipoJugadorId },
    { 
      populate: [
        'equipo',
        'equipo.torneoUsuario',
        'equipo.torneoUsuario.usuario',
        'equipo.torneoUsuario.torneo',
        'jugador',
        'jugador.position'
      ] 
    }
  );

  if (!equipoJugador) {
    throw ErrorFactory.notFound('Jugador no encontrado');
  }

  const equipoVendedor = equipoJugador.equipo as any;

  const equipoOferente = await entityManager.findOne(
    Equipo,
    {
      torneoUsuario: {
        usuario: userId,
        torneo: equipoVendedor.torneoUsuario.torneo.id
      }
    },
    { populate: ['torneoUsuario', 'torneoUsuario.usuario', 'jugadores', 'jugadores.jugador', 'jugadores.jugador.position'] }
  );

  if (!equipoOferente) {
    throw ErrorFactory.notFound('No tienes un equipo en este torneo');
  }
  if (equipoOferente.id === equipoVendedor.id) {
    throw ErrorFactory.validationAppError('No puedes hacer una oferta por tu propio jugador');
  }
  if (equipoOferente.presupuestoDisponible < montoOfertado) {
    throw ErrorFactory.validationAppError(
      `Presupuesto insuficiente. Disponible: $${equipoOferente.presupuestoDisponible.toLocaleString()}, Oferta: $${montoOfertado.toLocaleString()}`
    );
  }

  const jugador = equipoJugador.jugador as any;
  if (montoOfertado < (jugador.precio_actual || 0)) {
    throw ErrorFactory.validationAppError(
      `El monto debe ser al menos el precio actual del jugador: $${jugador.precio_actual?.toLocaleString()}`
    );
  }

  const ofertaExistente = await entityManager.findOne(OfertaVenta, {
    oferente: equipoOferente.id,
    equipoJugador: equipoJugadorId,
    estado: EstadoOferta.PENDIENTE
  });

  if (ofertaExistente) {
  const diferenciaMonto = montoOfertado - ofertaExistente.monto_ofertado;
    if (diferenciaMonto > 0) {
      if (equipoOferente.presupuestoDisponible < diferenciaMonto) {
        throw ErrorFactory.validationAppError(
          `Presupuesto insuficiente para aumentar la oferta. Disponible: $${equipoOferente.presupuestoDisponible.toLocaleString()}`
        );
      }
      equipoOferente.presupuesto_bloqueado += diferenciaMonto;
    } else if (diferenciaMonto < 0) {
      equipoOferente.presupuesto_bloqueado += diferenciaMonto;
    }

    ofertaExistente.monto_ofertado = montoOfertado;
    ofertaExistente.fecha_creacion = new Date();
    ofertaExistente.fecha_vencimiento = new Date(Date.now() + 48 * 60 * 60 * 1000);
    if (mensajeOferente) {
      ofertaExistente.mensaje_oferente = mensajeOferente;
    }

    await entityManager.flush();

    await sendOfertaRecibidaEmail(
      equipoVendedor.torneoUsuario.usuario.email,
      equipoVendedor.torneoUsuario.usuario.username,
      jugador.name || 'Jugador',
      montoOfertado,
      equipoOferente.nombre,
      equipoOferente.torneoUsuario.usuario.username,
      equipoVendedor.torneoUsuario.torneo.nombre,
      mensajeOferente,
      true // es actualización
    );

    return {
      oferta: ofertaExistente,
      mensaje: 'Oferta actualizada exitosamente',
      presupuesto: {
        total: equipoOferente.presupuesto,
        bloqueado: equipoOferente.presupuesto_bloqueado,
        disponible: equipoOferente.presupuestoDisponible
      }
    };
  }

  equipoOferente.presupuesto_bloqueado += montoOfertado;
  const nuevaOferta = entityManager.create(OfertaVenta, {
    oferente: equipoOferente,
    vendedor: equipoVendedor,
    equipoJugador,
    monto_ofertado: montoOfertado,
    mensaje_oferente: mensajeOferente,
    estado: EstadoOferta.PENDIENTE,
    fecha_creacion: new Date(),
    fecha_vencimiento: new Date(Date.now() + 48 * 60 * 60 * 1000)
  });

  entityManager.persist(nuevaOferta);
  await entityManager.flush();

  await sendOfertaRecibidaEmail(
    equipoVendedor.torneoUsuario.usuario.email,
    equipoVendedor.torneoUsuario.usuario.username,
    jugador.name || 'Jugador',
    montoOfertado,
    equipoOferente.nombre,
    equipoOferente.torneoUsuario.usuario.username,
    equipoVendedor.torneoUsuario.torneo.nombre,
    mensajeOferente
  );

  return {
    oferta: nuevaOferta,
    mensaje: 'Oferta creada exitosamente',
    presupuesto: {
      total: equipoOferente.presupuesto,
      bloqueado: equipoOferente.presupuesto_bloqueado,
      disponible: equipoOferente.presupuestoDisponible
    }
  };
}

/**
 * Aceptar una oferta de venta
 */
export async function aceptarOferta(
  userId: number,
  ofertaId: number,
  em?: EntityManager
) {
  const entityManager = em || orm.em.fork();

  const oferta = await entityManager.findOne(
    OfertaVenta,
    { id: ofertaId },
    {
      populate: [
        'oferente',
        'oferente.torneoUsuario',
        'oferente.torneoUsuario.usuario',
        'oferente.jugadores',
        'oferente.jugadores.jugador',
        'oferente.jugadores.jugador.position',
        'vendedor',
        'vendedor.torneoUsuario',
        'vendedor.torneoUsuario.usuario',
        'equipoJugador',
        'equipoJugador.equipo',
        'equipoJugador.jugador',
        'equipoJugador.jugador.position'
      ]
    }
  );

  if (!oferta) {
    throw ErrorFactory.notFound('Oferta no encontrada');
  }
  if (oferta.vendedor.torneoUsuario.usuario.id !== userId) {
    throw ErrorFactory.forbidden('No tienes permiso para aceptar esta oferta');
  }
  if (oferta.estado !== EstadoOferta.PENDIENTE) {
    throw ErrorFactory.validationAppError(`Esta oferta ya fue ${oferta.estado.toLowerCase()}`);
  }
  if (new Date() > oferta.fecha_vencimiento) {
    throw ErrorFactory.validationAppError('Esta oferta ya venció');
  }

  const jugador = oferta.equipoJugador.jugador as any;
  const posicionJugador = jugador.position?.description;

  if (!posicionJugador) {
    throw ErrorFactory.validationAppError('El jugador no tiene posición definida');
  }


  const jugadoresOferente = oferta.oferente.jugadores.getItems();
  const totalJugadores = jugadoresOferente.length;

  if (totalJugadores >= MAXIMO_JUGADORES_EQUIPO) {
    throw ErrorFactory.validationAppError(
      `El equipo comprador ya tiene el máximo de ${MAXIMO_JUGADORES_EQUIPO} jugadores`
    );
  }

  if (oferta.oferente.presupuestoDisponible < oferta.monto_ofertado) {
    throw ErrorFactory.validationAppError('El comprador ya no tiene presupuesto suficiente');
  }
  oferta.oferente.presupuesto_bloqueado -= oferta.monto_ofertado;
  oferta.oferente.presupuesto -= oferta.monto_ofertado;
  oferta.vendedor.presupuesto += oferta.monto_ofertado;
  oferta.equipoJugador.equipo = oferta.oferente as any;
  oferta.equipoJugador.es_titular = false;

  const transaccionCompra = entityManager.create(Transaccion, {
    equipo: oferta.oferente,
    tipo: TipoTransaccion.COMPRA_JUGADOR,
    monto: -oferta.monto_ofertado,
    jugador: jugador,
    fecha: new Date(),
    descripcion: `Compra de ${jugador.name} a ${oferta.vendedor.nombre}`
  });

  const transaccionVenta = entityManager.create(Transaccion, {
    equipo: oferta.vendedor,
    tipo: TipoTransaccion.VENTA_JUGADOR,
    monto: oferta.monto_ofertado,
    jugador: jugador,
    fecha: new Date(),
    descripcion: `Venta de ${jugador.name} a ${oferta.oferente.nombre}`
  });

  entityManager.persist(transaccionCompra);
  entityManager.persist(transaccionVenta);

  oferta.estado = EstadoOferta.ACEPTADA;

  await entityManager.flush();

  await rechazarOfertasAutomaticas(oferta.equipoJugador.id!, ofertaId, entityManager);

  await sendOfertaAceptadaEmail(
    oferta.oferente.torneoUsuario.usuario.email,
    oferta.oferente.torneoUsuario.usuario.username,
    jugador.name || 'Jugador',
    oferta.monto_ofertado,
    oferta.vendedor.nombre,
    oferta.vendedor.torneoUsuario.usuario.username,
    oferta.vendedor.torneoUsuario.torneo.nombre
  );

  return {
    mensaje: 'Oferta aceptada exitosamente',
    transferencia: {
      jugador: jugador.name,
      de: oferta.vendedor.nombre,
      a: oferta.oferente.nombre,
      monto: oferta.monto_ofertado
    },
    presupuesto_vendedor: {
      total: oferta.vendedor.presupuesto,
      bloqueado: oferta.vendedor.presupuesto_bloqueado,
      disponible: oferta.vendedor.presupuestoDisponible
    }
  };
}

/**
 * Rechazar una oferta de venta
 */
export async function rechazarOferta(
  userId: number,
  ofertaId: number,
  mensajeRespuesta?: string,
  em?: EntityManager
) {
  const entityManager = em || orm.em.fork();

  const oferta = await entityManager.findOne(
    OfertaVenta,
    { id: ofertaId },
    {
      populate: [
        'oferente',
        'oferente.torneoUsuario',
        'oferente.torneoUsuario.usuario',
        'vendedor',
        'vendedor.torneoUsuario',
        'vendedor.torneoUsuario.usuario',
        'equipoJugador',
        'equipoJugador.jugador'
      ]
    }
  );

  if (!oferta) {
    throw ErrorFactory.notFound('Oferta no encontrada');
  }
  if (oferta.vendedor.torneoUsuario.usuario.id !== userId) {
    throw ErrorFactory.forbidden('No tienes permiso para rechazar esta oferta');
  }
  if (oferta.estado !== EstadoOferta.PENDIENTE) {
    throw ErrorFactory.validationAppError(`Esta oferta ya fue ${oferta.estado.toLowerCase()}`);
  }


  oferta.oferente.presupuesto_bloqueado -= oferta.monto_ofertado;
  oferta.estado = EstadoOferta.RECHAZADA;
  if (mensajeRespuesta) {
    oferta.mensaje_respuesta = mensajeRespuesta;
  }
  await entityManager.flush();
  const jugador = oferta.equipoJugador.jugador as any;
  await sendOfertaRechazadaEmail(
    oferta.oferente.torneoUsuario.usuario.email,
    oferta.oferente.torneoUsuario.usuario.username,
    jugador.name || 'Jugador',
    oferta.monto_ofertado,
    oferta.vendedor.nombre,
    oferta.vendedor.torneoUsuario.usuario.username,
    oferta.vendedor.torneoUsuario.torneo.nombre,
    mensajeRespuesta
  );

  return {
    mensaje: 'Oferta rechazada exitosamente',
    presupuesto_oferente: {
      total: oferta.oferente.presupuesto,
      bloqueado: oferta.oferente.presupuesto_bloqueado,
      disponible: oferta.oferente.presupuestoDisponible
    }
  };
}

/**
 * Cancelar una oferta (por el oferente)
 */
export async function cancelarOferta(
  userId: number,
  ofertaId: number,
  em?: EntityManager
) {
  const entityManager = em || orm.em.fork();

  const oferta = await entityManager.findOne(
    OfertaVenta,
    { id: ofertaId },
    {
      populate: [
        'oferente',
        'oferente.torneoUsuario',
        'oferente.torneoUsuario.usuario'
      ]
    }
  );

  if (!oferta) {
    throw ErrorFactory.notFound('Oferta no encontrada');
  }
  if (oferta.oferente.torneoUsuario.usuario.id !== userId) {
    throw ErrorFactory.forbidden('No tienes permiso para cancelar esta oferta');
  }
  if (oferta.estado !== EstadoOferta.PENDIENTE) {
    throw ErrorFactory.validationAppError(`Esta oferta ya fue ${oferta.estado.toLowerCase()}`);
  }

  oferta.oferente.presupuesto_bloqueado -= oferta.monto_ofertado;
  oferta.estado = EstadoOferta.CANCELADA;

  await entityManager.flush();

  return {
    mensaje: 'Oferta cancelada exitosamente',
    presupuesto: {
      total: oferta.oferente.presupuesto,
      bloqueado: oferta.oferente.presupuesto_bloqueado,
      disponible: oferta.oferente.presupuestoDisponible
    }
  };
}

/**
 * Obtener ofertas enviadas por el usuario
 */
export async function obtenerOfertasEnviadas(
  userId: number,
  filtros: { estado?: EstadoOferta; limit?: number; offset?: number },
  em?: EntityManager
) {
  const entityManager = em || orm.em.fork();

  const where: any = {
    oferente: {
      torneoUsuario: {
        usuario: userId
      }
    }
  };

  if (filtros.estado) {
    where.estado = filtros.estado;
  }

  const [ofertas, total] = await entityManager.findAndCount(
    OfertaVenta,
    where,
    {
      populate: [
        'vendedor',
        'vendedor.torneoUsuario',
        'vendedor.torneoUsuario.usuario',
        'vendedor.torneoUsuario.torneo', 
        'equipoJugador',
        'equipoJugador.jugador',
        'equipoJugador.jugador.position',
        'equipoJugador.jugador.club'
      ],
      limit: filtros.limit || 20,
      offset: filtros.offset || 0,
      orderBy: { fecha_creacion: 'DESC' }
    }
  );

  return {
    ofertas: ofertas.map(o => formatearOferta(o, 'enviada')),
    total,
    limit: filtros.limit || 20,
    offset: filtros.offset || 0
  };
}

/**
 * Obtener ofertas recibidas por el usuario
 */
export async function obtenerOfertasRecibidas(
  userId: number,
  filtros: { estado?: EstadoOferta; limit?: number; offset?: number },
  em?: EntityManager
) {
  const entityManager = em || orm.em.fork();

  const where: any = {
    vendedor: {
      torneoUsuario: {
        usuario: userId
      }
    }
  };

  if (filtros.estado) {
    where.estado = filtros.estado;
  }

  const [ofertas, total] = await entityManager.findAndCount(
    OfertaVenta,
    where,
    {
      populate: [
        'oferente',
        'oferente.torneoUsuario',
        'oferente.torneoUsuario.usuario',
        'oferente.torneoUsuario.torneo',
        'equipoJugador',
        'equipoJugador.jugador',
        'equipoJugador.jugador.position',
        'equipoJugador.jugador.club'
      ],
      limit: filtros.limit || 20,
      offset: filtros.offset || 0,
      orderBy: { fecha_creacion: 'DESC' }
    }
  );

  return {
    ofertas: ofertas.map(o => formatearOferta(o, 'recibida')),
    total,
    limit: filtros.limit || 20,
    offset: filtros.offset || 0
  };
}

/**
 * Obtener detalles de una oferta específica
 */
export async function obtenerDetalleOferta(
  userId: number,
  ofertaId: number,
  em?: EntityManager
) {
  const entityManager = em || orm.em.fork();

  const oferta = await entityManager.findOne(
    OfertaVenta,
    { id: ofertaId },
    {
      populate: [
        'oferente',
        'oferente.torneoUsuario',
        'oferente.torneoUsuario.usuario',
        'oferente.torneoUsuario.torneo', 
        'vendedor',
        'vendedor.torneoUsuario',
        'vendedor.torneoUsuario.usuario',
        'vendedor.torneoUsuario.torneo',
        'equipoJugador',
        'equipoJugador.jugador',
        'equipoJugador.jugador.position',
        'equipoJugador.jugador.club'
      ]
    }
  );

  if (!oferta) {
    throw ErrorFactory.notFound('Oferta no encontrada');
  }

  const esOferente = oferta.oferente.torneoUsuario.usuario.id === userId;
  const esVendedor = oferta.vendedor.torneoUsuario.usuario.id === userId;

  if (!esOferente && !esVendedor) {
    throw ErrorFactory.forbidden('No tienes permiso para ver esta oferta');
  }

  const tipo = esOferente ? 'enviada' : 'recibida';
  return formatearOferta(oferta, tipo);
}

/**
 * Rechazar automáticamente otras ofertas del mismo jugador
 */
async function rechazarOfertasAutomaticas(
  equipoJugadorId: number,
  ofertaAceptadaId: number,
  em: EntityManager
) {
  const ofertasPendientes = await em.find(
    OfertaVenta,
    {
      equipoJugador: equipoJugadorId,
      estado: EstadoOferta.PENDIENTE,
      id: { $ne: ofertaAceptadaId }
    },
    {
      populate: [
        'oferente',
        'oferente.torneoUsuario',
        'oferente.torneoUsuario.usuario',
        'oferente.torneoUsuario.torneo',
        'equipoJugador',
        'equipoJugador.jugador',
        'equipoJugador.equipo', 
        'equipoJugador.equipo.torneoUsuario', 
        'equipoJugador.equipo.torneoUsuario.torneo' 
      ]
    }
  );

  for (const oferta of ofertasPendientes) {

    oferta.oferente.presupuesto_bloqueado -= oferta.monto_ofertado;
    oferta.estado = EstadoOferta.RECHAZADA;
    oferta.mensaje_respuesta = 'El jugador fue vendido a otro equipo';

    const jugador = oferta.equipoJugador.jugador as any;
    await sendOfertaRechazadaEmail(
      oferta.oferente.torneoUsuario.usuario.email,
      oferta.oferente.torneoUsuario.usuario.username,
      jugador.name || 'Jugador',
      oferta.monto_ofertado,
      'Sistema',
      'Sistema',
      oferta.oferente.torneoUsuario.torneo.nombre,
      'El jugador fue vendido a otro equipo'
    );
  }

  await em.flush();
}

/**
 * Procesar ofertas vencidas (Si agregamos un cron job)
 */
export async function procesarOfertasVencidas(em?: EntityManager) {
  const entityManager = em || orm.em.fork();

  const ofertasVencidas = await entityManager.find(
    OfertaVenta,
    {
      estado: EstadoOferta.PENDIENTE,
      fecha_vencimiento: { $lt: new Date() }
    },
    {
      populate: [
        'oferente',
        'oferente.torneoUsuario',
        'oferente.torneoUsuario.usuario',
        'equipoJugador',
        'equipoJugador.jugador'
      ]
    }
  );

  let contadorVencidas = 0;

  for (const oferta of ofertasVencidas) {

    oferta.oferente.presupuesto_bloqueado -= oferta.monto_ofertado;
    oferta.estado = EstadoOferta.VENCIDA;

    const jugador = oferta.equipoJugador.jugador as any;
    await sendOfertaVencidaEmail(
      oferta.oferente.torneoUsuario.usuario.email,
      oferta.oferente.torneoUsuario.usuario.username,
      jugador.name || 'Jugador',
      oferta.monto_ofertado, 
      oferta.oferente.torneoUsuario.torneo.nombre
    );

    contadorVencidas++;
  }

  await entityManager.flush();

  return {
    mensaje: `Se procesaron ${contadorVencidas} ofertas vencidas`,
    cantidad: contadorVencidas
  };
}

function formatearOferta(oferta: OfertaVenta, tipo: 'enviada' | 'recibida') {
  const jugador = oferta.equipoJugador.jugador as any;
  const ahora = new Date();
  const tiempoRestante = oferta.fecha_vencimiento.getTime() - ahora.getTime();
  const horasRestantes = Math.max(0, Math.floor(tiempoRestante / (1000 * 60 * 60)));

  const torneo = tipo === 'enviada' 
    ? oferta.vendedor.torneoUsuario.torneo
    : oferta.oferente.torneoUsuario.torneo;

  return {
    id: oferta.id,
    estado: oferta.estado,
    monto_ofertado: oferta.monto_ofertado,
    fecha_creacion: oferta.fecha_creacion,
    fecha_vencimiento: oferta.fecha_vencimiento,
    horas_restantes: oferta.estado === EstadoOferta.PENDIENTE ? horasRestantes : null,
    mensaje_oferente: oferta.mensaje_oferente,
    mensaje_respuesta: oferta.mensaje_respuesta,
    torneo: {
      id: torneo.id,
      nombre: torneo.nombre
    },
    jugador: {
      id: jugador.id,
      name: jugador.name,
      photo: jugador.photo,
      position: jugador.position?.description,
      club: jugador.club?.nombre,
      precio_actual: jugador.precio_actual
    },
    [tipo === 'enviada' ? 'vendedor' : 'oferente']: {
      id: tipo === 'enviada' ? oferta.vendedor.id : oferta.oferente.id,
      nombre: tipo === 'enviada' ? oferta.vendedor.nombre : oferta.oferente.nombre,
      usuario: tipo === 'enviada' 
        ? oferta.vendedor.torneoUsuario.usuario.username
        : oferta.oferente.torneoUsuario.usuario.username
    }
  };
}