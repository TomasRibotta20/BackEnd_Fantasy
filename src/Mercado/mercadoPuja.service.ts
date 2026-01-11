import { orm } from '../shared/db/orm.js';
import { MercadoPuja, EstadoPuja } from './mercadoPuja.entity.js';
import { ItemMercado } from './itemMercado.entity.js';
import { Equipo } from '../Equipo/equipo.entity.js';
import { MercadoDiario, EstadoMercado } from './mercadoDiario.entity.js';
import { ErrorFactory } from '../shared/errors/errors.factory.js';

/**
 * Crea o actualiza una oferta por un jugador del mercado
 */
export async function ofertar(equipoId: number, itemMercadoId: number, monto: number, userId: number) {
  return await orm.em.transactional(async (em) => {

    const item = await em.findOne(
      ItemMercado,
      itemMercadoId,
      { populate: ['mercado', 'mercado.torneo', 'jugador'] }
    );

    if (!item) {
      throw ErrorFactory.notFound('Item de mercado no encontrado');
    }
    if (item.mercado.estado !== EstadoMercado.ABIERTO) {
      throw ErrorFactory.conflict('El mercado está cerrado');
    }


    const precioActual = item.jugador.precio_actual || 0;
    if (monto < precioActual) {
      throw ErrorFactory.badRequest(
        `El monto debe ser al menos $${precioActual.toLocaleString()} (precio actual del jugador)`
      );
    }

    const equipo = await em.findOne(
      Equipo,
      equipoId,
      { populate: ['torneo_usuario', 'torneo_usuario.usuario', 'torneo_usuario.torneo'] }
    );

    if (!equipo) {
      throw ErrorFactory.notFound('Equipo no encontrado');
    }
    const ownerId = equipo.torneo_usuario.usuario.id;
    if (ownerId !== userId) {
      throw ErrorFactory.forbidden('No tienes permisos para ofertar con este equipo');
    }
    if (equipo.torneo_usuario.torneo.id !== item.mercado.torneo.id) {
      throw ErrorFactory.badRequest('El equipo no pertenece al torneo del mercado');
    }

    const pujaExistente = await em.findOne(MercadoPuja, {
      item: itemMercadoId,
      equipo: equipoId,
      estado: EstadoPuja.PENDIENTE
    });
    if (pujaExistente) {
      const diferencia = monto - pujaExistente.monto;
      if (equipo.presupuestoDisponible < diferencia) {
        throw ErrorFactory.badRequest(
          `Presupuesto insuficiente. Disponible: $${equipo.presupuestoDisponible.toLocaleString()}`
        );
      }

      equipo.presupuesto_bloqueado += diferencia;
      pujaExistente.monto = monto;
      pujaExistente.precio_referencia = precioActual;
      pujaExistente.fecha_oferta = new Date();
      await em.flush();
      return {
        accion: 'actualizada',
        puja: {
          id: pujaExistente.id,
          monto: pujaExistente.monto,
          jugador: item.jugador.nombre,
          precio_referencia: precioActual
        },
        presupuesto: {
          bloqueado: equipo.presupuesto_bloqueado,
          disponible: equipo.presupuestoDisponible
        }
      };
    } else {
      if (equipo.presupuestoDisponible < monto) {
        throw ErrorFactory.badRequest(
          `Presupuesto insuficiente. Disponible: $${equipo.presupuestoDisponible.toLocaleString()}`
        );
      }
      equipo.presupuesto_bloqueado += monto;
      const puja = em.create(MercadoPuja, {
        item,
        equipo,
        monto,
        precio_referencia: precioActual,
        fecha_oferta: new Date(),
        estado: EstadoPuja.PENDIENTE
      });

      em.persist(puja);
      item.cantidad_pujas++;

      await em.flush();

      return {
        accion: 'creada',
        puja: {
          id: puja.id,
          monto: puja.monto,
          jugador: item.jugador.nombre,
          precio_referencia: precioActual
        },
        presupuesto: {
          bloqueado: equipo.presupuesto_bloqueado,
          disponible: equipo.presupuestoDisponible
        }
      };
    }
  });
}

/**
 * Cancela una oferta antes del cierre del mercado
 */
export async function cancelarOferta(pujaId: number, userId: number) {
  return await orm.em.transactional(async (em) => {
    const puja = await em.findOne(
      MercadoPuja,
      pujaId,
      { populate: ['item.mercado', 'equipo', 'equipo.torneo_usuario', 'equipo.torneo_usuario.usuario', 'item.jugador'] }
    );

    if (!puja) {
      throw ErrorFactory.notFound('Oferta no encontrada');
    }

    const ownerId = puja.equipo.torneo_usuario.usuario.id;
    if (ownerId !== userId) {
      throw ErrorFactory.forbidden('No tienes permisos para cancelar esta oferta');
    }
    if (puja.item.mercado.estado !== EstadoMercado.ABIERTO) {
      throw ErrorFactory.conflict('No se puede cancelar la oferta, el mercado está cerrado');
    }
    if (puja.estado !== EstadoPuja.PENDIENTE) {
      throw ErrorFactory.badRequest('Solo se pueden cancelar ofertas pendientes');
    }

    puja.equipo.presupuesto_bloqueado -= puja.monto;
    puja.estado = EstadoPuja.CANCELADA;
    puja.observaciones = 'Cancelada por el usuario';

    puja.item.cantidad_pujas = Math.max(0, puja.item.cantidad_pujas - 1);

    await em.flush();

    return {
      message: 'Oferta cancelada exitosamente',
      puja: {
        id: puja.id,
        jugador: puja.item.jugador.nombre,
        monto: puja.monto
      },
      presupuesto: {
        bloqueado: puja.equipo.presupuesto_bloqueado,
        disponible: puja.equipo.presupuestoDisponible
      }
    };
  });
}

/**
 * Obtiene las ofertas activas de un equipo
 */
export async function obtenerMisOfertas(equipoId: number, userId: number) {
  const em = orm.em.fork();

  const equipo = await em.findOne(
    Equipo,
    equipoId,
    { populate: ['torneo_usuario', 'torneo_usuario.usuario'] }
  );

  if (!equipo) {
    throw ErrorFactory.notFound('Equipo no encontrado');
  }

  const ownerId = equipo.torneo_usuario.usuario.id;
  if (ownerId !== userId) {
    throw ErrorFactory.forbidden('No tienes permisos para ver las ofertas de este equipo');
  }

  const pujas = await em.find(
    MercadoPuja,
    {
      equipo: equipoId,
      estado: EstadoPuja.PENDIENTE
    },
    {
      populate: ['item.jugador', 'item.jugador.posicion', 'item.jugador.club', 'item.mercado'],
      orderBy: { fecha_oferta: 'DESC' }
    }
  );

  return pujas.map(puja => ({
    id: puja.id,
    monto: puja.monto,
    precio_referencia: puja.precio_referencia,
    fecha_oferta: puja.fecha_oferta,
    jugador: {
      id: puja.item.jugador.id,
      nombre: puja.item.jugador.nombre,
      posicion: puja.item.jugador.posicion?.descripcion,
      club: puja.item.jugador.club.nombre,
      precio_actual: puja.item.jugador.precio_actual,
      foto: puja.item.jugador.foto
    },
    mercado: {
      id: puja.item.mercado.id,
      numero: puja.item.mercado.numero_mercado
    }
  }));
}