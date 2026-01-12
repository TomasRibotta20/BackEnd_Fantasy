import { EntityManager } from '@mikro-orm/core';
import { orm } from '../shared/db/orm.js';
import { OfertaVenta, EstadoOferta } from './ofertaVenta.entity.js';
import { Equipo } from '../Equipo/equipo.entity.js';
import { EquipoJugador } from '../Equipo/equipoJugador.entity.js';
import { Transaccion, TipoTransaccion } from '../Equipo/transaccion.entity.js';
import { ErrorFactory } from '../shared/errors/errors.factory.js';
import { sendOfertaRecibidaEmail, sendOfertaAceptadaEmail, sendOfertaRechazadaEmail, sendOfertaVencidaEmail } from '../shared/mailer/emailTemplates.js';
import { Player } from '../Player/player.entity.js';
import { TorneoUsuario } from '../Torneo/torneoUsuario.entity.js';

const MAXIMO_JUGADORES_EQUIPO = 15;


/**
 * Valida que el usuario tenga un equipo activo (no expulsado) en el torneo
 */
async function validarParticipacionActiva(userId: number, torneoId: number, em: EntityManager) {
  const equipoTorneo = await em.findOne(
    Equipo,
    {
      torneo_usuario: {
        usuario: userId,
        torneo: torneoId,
        expulsado: false
      }
    },
    { populate: ['torneo_usuario'] }
  );

  if (!equipoTorneo) {
    throw ErrorFactory.forbidden('No tienes un equipo activo en este torneo o has sido expulsado');
  }

  return equipoTorneo;
}

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
        'equipo.torneo_usuario',
        'equipo.torneo_usuario.usuario',
        'equipo.torneo_usuario.torneo',
        'jugador',
        'jugador.posicion'
      ] 
    }
  );

  if (!equipoJugador) {
    throw ErrorFactory.notFound('Jugador no encontrado');
  }

  const equipoVendedor = equipoJugador.equipo as any as Equipo;
  const torneoId = equipoVendedor.torneo_usuario.torneo.id!;
  const equipoOferente = await validarParticipacionActiva(userId, torneoId, entityManager);
  await entityManager.populate(equipoOferente, ['torneo_usuario.usuario', 'jugadores', 'jugadores.jugador', 'jugadores.jugador.posicion']);

  if (equipoOferente.id === equipoVendedor.id) {
    throw ErrorFactory.validationAppError('No puedes hacer una oferta por tu propio jugador');
  }
  if (equipoOferente.presupuestoDisponible < montoOfertado) {
    throw ErrorFactory.validationAppError(
      `Presupuesto insuficiente. Disponible: $${equipoOferente.presupuestoDisponible.toLocaleString()}, Oferta: $${montoOfertado.toLocaleString()}`
    );
  }

  const jugador = equipoJugador.jugador as any as Player;
  if (montoOfertado < (jugador.precio_actual || 0)) {
    throw ErrorFactory.validationAppError(
      `El monto debe ser al menos el precio actual del jugador: $${jugador.precio_actual?.toLocaleString()}`
    );
  }

  const ofertaExistente = await entityManager.findOne(OfertaVenta, {
    oferente: equipoOferente.id,
    equipo_jugador: equipoJugadorId,
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
      equipoVendedor.torneo_usuario.usuario.email,
      equipoVendedor.torneo_usuario.usuario.username,
      jugador.nombre || 'Jugador',
      montoOfertado,
      equipoOferente.nombre,
      equipoOferente.torneo_usuario.usuario.username,
      equipoVendedor.torneo_usuario.torneo.nombre,
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
    equipo_jugador: equipoJugador,
    monto_ofertado: montoOfertado,
    mensaje_oferente: mensajeOferente,
    estado: EstadoOferta.PENDIENTE,
    fecha_creacion: new Date(),
    fecha_vencimiento: new Date(Date.now() + 48 * 60 * 60 * 1000)
  });

  entityManager.persist(nuevaOferta);
  await entityManager.flush();

  await sendOfertaRecibidaEmail(
    equipoVendedor.torneo_usuario.usuario.email,
    equipoVendedor.torneo_usuario.usuario.username,
    jugador.nombre || 'Jugador',
    montoOfertado,
    equipoOferente.nombre,
    equipoOferente.torneo_usuario.usuario.username,
    equipoVendedor.torneo_usuario.torneo.nombre,
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
        'oferente.torneo_usuario',
        'oferente.torneo_usuario.usuario',
        'oferente.jugadores',
        'oferente.jugadores.jugador',
        'oferente.jugadores.jugador.posicion',
        'vendedor',
        'vendedor.torneo_usuario',
        'vendedor.torneo_usuario.usuario',
        'equipo_jugador',
        'equipo_jugador.equipo',
        'equipo_jugador.jugador',
        'equipo_jugador.jugador.posicion'
      ]
    }
  );

  if (!oferta) {
    throw ErrorFactory.notFound('Oferta no encontrada');
  }
  if (oferta.vendedor.torneo_usuario.usuario.id !== userId) {
    throw ErrorFactory.forbidden('No tienes permiso para aceptar esta oferta');
  }
  if (oferta.estado !== EstadoOferta.PENDIENTE) {
    throw ErrorFactory.validationAppError(`Esta oferta ya fue ${oferta.estado.toLowerCase()}`);
  }
  if (new Date() > oferta.fecha_vencimiento) {
    throw ErrorFactory.validationAppError('Esta oferta ya venció');
  }

  const jugador = oferta.equipo_jugador.jugador as any as Player;
  const posicionJugador = jugador.posicion?.descripcion;

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
  oferta.equipo_jugador.equipo = oferta.oferente as any;
  oferta.equipo_jugador.es_titular = false;

  const transaccionCompra = entityManager.create(Transaccion, {
    equipo: oferta.oferente,
    tipo: TipoTransaccion.COMPRA_JUGADOR,
    monto: -oferta.monto_ofertado,
    jugador: jugador,
    fecha: new Date(),
    descripcion: `Compra de ${jugador.nombre} a ${oferta.vendedor.nombre}`
  });

  const transaccionVenta = entityManager.create(Transaccion, {
    equipo: oferta.vendedor,
    tipo: TipoTransaccion.VENTA_JUGADOR,
    monto: oferta.monto_ofertado,
    jugador: jugador,
    fecha: new Date(),
    descripcion: `Venta de ${jugador.nombre} a ${oferta.oferente.nombre}`
  });

  entityManager.persist(transaccionCompra);
  entityManager.persist(transaccionVenta);

  oferta.estado = EstadoOferta.ACEPTADA;

  await entityManager.flush();

  await rechazarOfertasAutomaticas(oferta.equipo_jugador.id!, ofertaId, entityManager);

  await sendOfertaAceptadaEmail(
    oferta.oferente.torneo_usuario.usuario.email,
    oferta.oferente.torneo_usuario.usuario.username,
    jugador.nombre || 'Jugador',
    oferta.monto_ofertado,
    oferta.vendedor.nombre,
    oferta.vendedor.torneo_usuario.usuario.username,
    oferta.vendedor.torneo_usuario.torneo.nombre
  );

  return {
    mensaje: 'Oferta aceptada exitosamente',
    transferencia: {
      jugador: jugador.nombre,
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
        'oferente.torneo_usuario',
        'oferente.torneo_usuario.usuario',
        'vendedor',
        'vendedor.torneo_usuario',
        'vendedor.torneo_usuario.usuario',
        'equipo_jugador',
        'equipo_jugador.jugador'
      ]
    }
  );

  if (!oferta) {
    throw ErrorFactory.notFound('Oferta no encontrada');
  }
  if (oferta.vendedor.torneo_usuario.usuario.id !== userId) {
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
  const jugador = oferta.equipo_jugador.jugador as any as Player;
  await sendOfertaRechazadaEmail(
    oferta.oferente.torneo_usuario.usuario.email,
    oferta.oferente.torneo_usuario.usuario.username,
    jugador.nombre || 'Jugador',
    oferta.monto_ofertado,
    oferta.vendedor.nombre,
    oferta.vendedor.torneo_usuario.usuario.username,
    oferta.vendedor.torneo_usuario.torneo.nombre,
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
        'oferente.torneo_usuario',
        'oferente.torneo_usuario.usuario'
      ]
    }
  );

  if (!oferta) {
    throw ErrorFactory.notFound('Oferta no encontrada');
  }
  if (oferta.oferente.torneo_usuario.usuario.id !== userId) {
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
  torneoId: number,
  filtros: { estado?: EstadoOferta; limit?: number; offset?: number },
  em?: EntityManager
) {
  const entityManager = em || orm.em.fork();

  await validarParticipacionActiva(userId, torneoId, entityManager);
  const where: any = {
    oferente: {
      torneo_usuario: {
        usuario: userId,
        torneo: torneoId,
        expulsado: false
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
        'vendedor.torneo_usuario',
        'vendedor.torneo_usuario.usuario',
        'vendedor.torneo_usuario.torneo', 
        'equipo_jugador',
        'equipo_jugador.jugador',
        'equipo_jugador.jugador.posicion',
        'equipo_jugador.jugador.club'
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
  torneoId: number,
  filtros: { estado?: EstadoOferta; limit?: number; offset?: number },
  em?: EntityManager
) {
  const entityManager = em || orm.em.fork();

  await validarParticipacionActiva(userId, torneoId, entityManager);

  const where: any = {
    vendedor: {
      torneo_usuario: {
        usuario: userId,
        torneo: torneoId,
        expulsado: false 
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
        'oferente.torneo_usuario',
        'oferente.torneo_usuario.usuario',
        'oferente.torneo_usuario.torneo',
        'equipo_jugador',
        'equipo_jugador.jugador',
        'equipo_jugador.jugador.posicion',
        'equipo_jugador.jugador.club'
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
        'oferente.torneo_usuario',
        'oferente.torneo_usuario.usuario',
        'oferente.torneo_usuario.torneo', 
        'vendedor',
        'vendedor.torneo_usuario',
        'vendedor.torneo_usuario.usuario',
        'vendedor.torneo_usuario.torneo',
        'equipo_jugador',
        'equipo_jugador.jugador',
        'equipo_jugador.jugador.posicion',
        'equipo_jugador.jugador.club'
      ]
    }
  );

  if (!oferta) {
    throw ErrorFactory.notFound('Oferta no encontrada');
  }

  const esOferente = oferta.oferente.torneo_usuario.usuario.id === userId;
  const esVendedor = oferta.vendedor.torneo_usuario.usuario.id === userId;

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
      equipo_jugador: equipoJugadorId,
      estado: EstadoOferta.PENDIENTE,
      id: { $ne: ofertaAceptadaId }
    },
    {
      populate: [
        'oferente',
        'oferente.torneo_usuario',
        'oferente.torneo_usuario.usuario',
        'oferente.torneo_usuario.torneo',
        'equipo_jugador',
        'equipo_jugador.jugador',
        'equipo_jugador.equipo', 
        'equipo_jugador.equipo.torneo_usuario', 
        'equipo_jugador.equipo.torneo_usuario.torneo' 
      ]
    }
  );

  for (const oferta of ofertasPendientes) {

    oferta.oferente.presupuesto_bloqueado -= oferta.monto_ofertado;
    oferta.estado = EstadoOferta.RECHAZADA;
    oferta.mensaje_respuesta = 'El jugador fue vendido a otro equipo';

    const jugador = oferta.equipo_jugador.jugador as any as Player;
    await sendOfertaRechazadaEmail(
      oferta.oferente.torneo_usuario.usuario.email,
      oferta.oferente.torneo_usuario.usuario.username,
      jugador.nombre || 'Jugador',
      oferta.monto_ofertado,
      'Sistema',
      'Sistema',
      oferta.oferente.torneo_usuario.torneo.nombre,
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
        'oferente.torneo_usuario',
        'oferente.torneo_usuario.usuario',
        'equipo_jugador',
        'equipo_jugador.jugador'
      ]
    }
  );

  let contadorVencidas = 0;

  for (const oferta of ofertasVencidas) {

    oferta.oferente.presupuesto_bloqueado -= oferta.monto_ofertado;
    oferta.estado = EstadoOferta.VENCIDA;

    const jugador = oferta.equipo_jugador.jugador as any as Player;
    await sendOfertaVencidaEmail(
      oferta.oferente.torneo_usuario.usuario.email,
      oferta.oferente.torneo_usuario.usuario.username,
      jugador.nombre || 'Jugador',
      oferta.monto_ofertado, 
      oferta.oferente.torneo_usuario.torneo.nombre
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
  const jugador = oferta.equipo_jugador.jugador as any as Player;
  const ahora = new Date();
  const tiempoRestante = oferta.fecha_vencimiento.getTime() - ahora.getTime();
  const horasRestantes = Math.max(0, Math.floor(tiempoRestante / (1000 * 60 * 60)));

  const torneo = tipo === 'enviada' 
    ? oferta.vendedor.torneo_usuario.torneo
    : oferta.oferente.torneo_usuario.torneo;

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
      nombre: jugador.nombre,
      foto: jugador.foto,
      posicion: jugador.posicion?.descripcion,
      club: jugador.club?.nombre,
      precio_actual: jugador.precio_actual
    },
    [tipo === 'enviada' ? 'vendedor' : 'oferente']: {
      id: tipo === 'enviada' ? oferta.vendedor.id : oferta.oferente.id,
      nombre: tipo === 'enviada' ? oferta.vendedor.nombre : oferta.oferente.nombre,
      usuario: tipo === 'enviada' 
        ? oferta.vendedor.torneo_usuario.usuario.username
        : oferta.oferente.torneo_usuario.usuario.username
    }
  };
}