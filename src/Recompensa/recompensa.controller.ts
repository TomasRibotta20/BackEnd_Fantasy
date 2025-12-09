import { Request, Response, NextFunction } from 'express';
import { orm } from '../shared/db/orm.js';
import { LockMode } from '@mikro-orm/core';
import { Recompensa } from './recompensa.entity.js';
import { Premio, Tier } from '../Premio/premio.entity.js';
import { ErrorFactory } from '../shared/errors/errors.factory.js';
import { Saldo } from '../Premio/saldo.entity.js';
import { Ruleta } from '../Premio/ruleta.entity.js';
import { procesarSaldo, procesarRuleta, procesarPlayerPick } from './recompensa.service.js';
import { EquipoJugador } from '../Equipo/equipoJugador.entity.js';
import { PlayerPick } from '../Premio/playerpick.entity.js';
import { Player } from '../Player/player.entity.js';
import { Equipo } from '../Equipo/equipo.entity.js';
import { procesarPicksExpiradosDelUsuario, addSaldoLocal, ficharJugadorLocal } from './recompensa.service.js';

const em = orm.em;

/**
 * Calcula el tier de premio según la posición en la jornada
 * @param posicion - Posición del usuario en la jornada
 * @returns Tier correspondiente (ORO, PLATA o BRONCE)
 */
export function calcularTierPorPosicion(posicion: number): Tier {
  if (posicion === 1) return Tier.ORO;
  if (posicion <= 3) return Tier.PLATA;
  return Tier.BRONCE;
}


async function getPendientes(req: Request, res: Response, next: NextFunction) {
  try {
    const usuarioId = req.authUser.user?.userId!;
    await procesarPicksExpiradosDelUsuario(em, usuarioId);
    const pendientes = await em.find(Recompensa, {
      torneoUsuario: { usuario: usuarioId },
      fecha_reclamo: null,
      $or: [
        { fechaExpiracionPick: null },
        { fechaExpiracionPick: { $gte: new Date() } }
      ]
    }, {
      populate: ['jornada', 'torneoUsuario.torneo'],
      orderBy: { jornada: { id: 'DESC' } }
    });

    res.status(200).json({
      hayPendientes: pendientes.length > 0,
      cantidad: pendientes.length,
      data: pendientes.map(p => ({
        id: p.id,
        torneo: p.torneoUsuario.torneo.nombre,
        jornada: `Fecha ${p.jornada.nombre}`,
        posicion: p.posicionJornada
      }))
    });
  } catch (error: any) {
    next(ErrorFactory.internal("Error al obtener recompensas pendientes"));
  }
}

async function getOpcionesRecompensa(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
      
    const recompensa = await em.findOne(Recompensa, id, {
      populate: ['torneoUsuario.usuario']
    });
    if (!recompensa) {
      throw ErrorFactory.notFound("Recompensa no encontrada");
    }
    if (recompensa.torneoUsuario.usuario.id !== req.authUser.user?.userId) {
      throw ErrorFactory.forbidden("Esta recompensa no es tuya");
    }
    if (recompensa.fecha_reclamo) {
      throw ErrorFactory.conflict("Esta recompensa ya fue reclamada y finalizada.");
    }
    if (recompensa.fechaExpiracionPick) {
      if (new Date() > recompensa.fechaExpiracionPick) {
        throw ErrorFactory.conflict("El tiempo para elegir ha expirado. Se asignó una compensación automáticamente.");
      }
    }
    if (recompensa.premioConfiguracion && recompensa.opcionesPickDisponibles) {
      const jugadoresDisponibles = await em.find(Player, {
        id: { $in: recompensa.opcionesPickDisponibles }
      });
      return res.status(200).json({
        tipo: 'pick_pendiente',
        recompensaId: recompensa.id,
        mensaje: 'Tienes un pick pendiente. Elige tu jugador.',
        opciones: jugadoresDisponibles.map(j => ({
          id: j.id!,
          name: j.name,
          position: j.position?.description || 'N/A',
          team: j.club.nombre,
          precio_actual: j.precio_actual,
          foto_perfil: j.photo
        })),
        opcionesIds: recompensa.opcionesPickDisponibles,
        expira: recompensa.fechaExpiracionPick
      });
    }
    if (recompensa.premioConfiguracion) {
      throw ErrorFactory.conflict("Ya elegiste una opción para esta recompensa. Está procesándose.");
    }
    const tierCalculado = calcularTierPorPosicion(recompensa.posicionJornada);
    const premiosDisponibles = await em.find(Premio, { tier: tierCalculado });

    return res.status(200).json({
      recompensaId: recompensa.id,
      posicion: recompensa.posicionJornada,
      tier: tierCalculado,
      opciones: premiosDisponibles
    });
  } catch (error: any) {
    next(error);
  }
}

async function elegirPremio(req: Request, res: Response, next: NextFunction) {
  try {
    const recompensaId = Number(req.body.recompensaId);
    const premioId = Number(req.body.premioId);
    const usuarioId = req.authUser.user?.userId!;

    const recompensa = await em.findOne(Recompensa, recompensaId, {
      populate: ['torneoUsuario.torneo', 'torneoUsuario.usuario']
    });
    if (!recompensa) {
      throw ErrorFactory.notFound("Recompensa no encontrada");
    }
    if (recompensa.torneoUsuario.usuario.id !== usuarioId) throw ErrorFactory.forbidden("No es tu recompensa");
    if (recompensa.fecha_reclamo) throw ErrorFactory.conflict("Ya reclamada");
    if (recompensa.premioConfiguracion) throw ErrorFactory.conflict("Ya elegiste opción. Resuelve la actual.");

    const premioConfig = await em.findOne(Premio, premioId);
    if (!premioConfig) {
      throw ErrorFactory.notFound("Premio no encontrado");
    }
    const tierRealUsuario = calcularTierPorPosicion(recompensa.posicionJornada);
    if (premioConfig.tier !== tierRealUsuario) {
        throw ErrorFactory.forbidden(`Error de integridad: Este premio es ${premioConfig.tier} y tú eres ${tierRealUsuario}.`);
    }
    let resultado;
    if (premioConfig instanceof Saldo) {
      resultado = await procesarSaldo(em, recompensa, premioConfig, usuarioId);
    } 
    else if (premioConfig instanceof Ruleta) {
      resultado = await procesarRuleta(em, recompensa, premioConfig, usuarioId);
    } 
    else if (premioConfig instanceof PlayerPick) {
      resultado = await procesarPlayerPick(em, recompensa, premioConfig, usuarioId);
    }
    else {
      throw ErrorFactory.badRequest("Tipo de premio no reconocido");
    }
    return res.status(200).json(resultado);
  } catch (error: any) {
    next(error);
  }
}

async function confirmarPick(req: Request, res: Response, next: NextFunction) {
  try {
    const recompensaId = Number(req.body.recompensaId);
    const jugadorId = Number(req.body.jugadorId);
    const usuarioId = req.authUser.user?.userId!;

    const recompensa = await em.findOne(Recompensa, recompensaId, {
      populate: ['torneoUsuario.torneo', 'torneoUsuario.usuario']
    });

    if (!recompensa) {
      throw ErrorFactory.notFound("Recompensa no encontrada");
    }

    if (recompensa.torneoUsuario.usuario.id !== usuarioId) {
        throw ErrorFactory.forbidden("No es tu recompensa");
    }
    if (recompensa.fecha_reclamo) {
        throw ErrorFactory.conflict("Esta recompensa ya fue reclamada.");
    }
    if (!recompensa.opcionesPickDisponibles || recompensa.opcionesPickDisponibles.length === 0) {
        throw ErrorFactory.badRequest("Esta recompensa no tiene un proceso de selección activo.");
    }
    const idElegido = Number(jugadorId);
    if (!recompensa.opcionesPickDisponibles.includes(idElegido)) {
        throw ErrorFactory.badRequest("El jugador seleccionado no estaba entre tus opciones válidas.");
    }
    if (recompensa.fechaExpiracionPick && new Date() > recompensa.fechaExpiracionPick) {
        throw ErrorFactory.conflict("El tiempo para elegir ha expirado.");
    }

    const resultadoTransaccion = await em.transactional(async (txEm) => {
      const recompensaTx = txEm.merge(recompensa);  
      const jugador = await txEm.findOne(Player, idElegido, {
          lockMode: LockMode.PESSIMISTIC_WRITE
      });
      if (!jugador) {
        throw ErrorFactory.notFound("Jugador no encontrado durante la transacción.");
      }
      const torneoId = recompensaTx.torneoUsuario.torneo.id!;
      const ocupado = await txEm.count(EquipoJugador, { 
          jugador: jugador, 
          equipo: { torneoUsuario: { torneo: torneoId } } 
      });

      if (ocupado > 0) {
          const montoCompensacion = Number(jugador.precio_actual);
          recompensaTx.jugador = undefined;
          recompensaTx.opcionesPickDisponibles = undefined;
          recompensaTx.montoCompensacion = montoCompensacion;
          recompensaTx.fecha_reclamo = new Date();
          await addSaldoLocal(txEm, usuarioId, torneoId, montoCompensacion); 
          return { status: 'COMPENSACION', monto: montoCompensacion, nombre: jugador.name };
      }

      const cantidadFinal = await txEm.count(EquipoJugador, { 
          equipo: { torneoUsuario: { usuario: usuarioId, torneo: torneoId } } 
      });
        
      if (cantidadFinal >= 15) {
          throw ErrorFactory.conflict("Tu plantilla se llenó mientras pensabas.");
      }
      const equipo = await txEm.findOne(Equipo, { torneoUsuario: { usuario: usuarioId, torneo: torneoId } });
      if (!equipo) throw ErrorFactory.notFound("No tienes equipo");

      await ficharJugadorLocal(txEm, equipo, jugador);
      recompensaTx.jugador = jugador;
      recompensaTx.fecha_reclamo = new Date();
      recompensaTx.opcionesPickDisponibles = undefined;
      return { status: 'EXITO', jugador: jugador };
  });

  if (resultadoTransaccion.status === 'COMPENSACION') {
      return res.status(200).json({
          tipo: 'compensacion_saldo',
          montoCompensacion: resultadoTransaccion.monto,
          jugadorIntentado: resultadoTransaccion.nombre,
          mensaje: `¡Tardaste mucho! Alguien fichó a ${resultadoTransaccion.nombre} mientras decidías. Te acreditamos su valor.`
      });
  }
  
  return res.status(200).json({ 
      success: true,
      tipo: 'pick_confirmado', 
      jugador: resultadoTransaccion.jugador, 
      mensaje: `¡Has fichado a ${resultadoTransaccion.jugador!.name}!`
  });
  } catch (error) {
    next(error);
  }
}

export { elegirPremio, getOpcionesRecompensa, getPendientes, confirmarPick };