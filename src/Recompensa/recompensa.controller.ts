import { Request, Response, NextFunction } from 'express';
import { orm } from '../shared/db/orm.js';
import { LockMode } from '@mikro-orm/core';
import { Recompensa } from './recompensa.entity.js';
import { Premio, RangoPrecio, Tier } from '../Premio/premio.entity.js';
import { ErrorFactory } from '../shared/errors/errors.factory.js';
import { Saldo } from '../Premio/saldo.entity.js';
import { Ruleta } from '../Premio/ruleta.entity.js';
import { sortearJugador } from './recompensa.service.js';
import { EquipoJugador } from '../Equipo/equipoJugador.entity.js';
import { PlayerPick } from '../Premio/playerpick.entity.js';
import { Player } from '../Player/player.entity.js';
import { Equipo } from '../Equipo/equipo.entity.js';
import { EntityManager } from '@mikro-orm/mysql';

const em = orm.em;

/**
 * Calcula el tier de premio según la posición en la jornada
 * @param posicion - Posición del usuario en la jornada
 * @returns Tier correspondiente (ORO, PLATA o BRONCE)
 */
function calcularTierPorPosicion(posicion: number): Tier {
  if (posicion === 1) return Tier.ORO;
  if (posicion <= 3) return Tier.PLATA;
  return Tier.BRONCE;
}


async function getPendientes(req: Request, res: Response, next: NextFunction) {
  try {
    const usuarioId = req.authUser.user?.userId;
    const pendientes = await em.find(Recompensa, {
      torneoUsuario: { usuario: usuarioId },
      fecha_reclamo: null
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
    if (recompensa.premioConfiguracion) {
      throw ErrorFactory.conflict("Ya elegiste un premio. Finaliza el proceso actual.");
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

    if (premioConfig instanceof Saldo) {
      const monto = premioConfig.monto;
      await em.transactional(async (txEm) => { 
        const recompensaTx = txEm.merge(recompensa);
        recompensaTx.premioConfiguracion = premioConfig;
        await addSaldoLocal(txEm, usuarioId, recompensaTx.torneoUsuario.torneo.id!, monto); 
        recompensaTx.monto = monto;
        recompensaTx.fecha_reclamo = new Date();
      });
      return res.status(200).json({ tipo: 'saldo', monto, mensaje: '¡Dinero acreditado!' });//Se devuelve con status?
    }

    if (premioConfig instanceof Ruleta) {
      const torneoId = recompensa.torneoUsuario.torneo.id!;
      const cantidadJugadores = await em.count(EquipoJugador, { 
            equipo: { torneoUsuario: { usuario: usuarioId, torneo: torneoId } } 
        });

      if (cantidadJugadores >= 15) {
        throw ErrorFactory.conflict("PLANTILLA_LLENA, No tienes espacio. Vende un jugador antes de jugar.");
      }
      
      const resultado = await sortearJugador(
        em, 
        premioConfig.configuracion, 
        torneoId
      );
      const { jugador: jugadorGanado, rangoSorteado } = resultado;
      if (!jugadorGanado) {
        let montoCompensacion: number;
        if (rangoSorteado.max) {
          montoCompensacion = (Number(rangoSorteado.min) + Number(rangoSorteado.max)) / 2;
        } else {
          montoCompensacion = Number(rangoSorteado.min);
        }
        await em.transactional(async (txEm) => { 
          const recompensaTx = txEm.merge(recompensa);
          recompensaTx.premioConfiguracion = premioConfig;
          await addSaldoLocal(txEm, usuarioId, torneoId, montoCompensacion); 
          recompensaTx.montoCompensacion = montoCompensacion;
          recompensaTx.fecha_reclamo = new Date();
        });
        return res.status(200).json({ 
          tipo: 'dinero_fallback',
          rangoOriginal: rangoSorteado,
          montoCompensacion: montoCompensacion,
          mensaje: '¡Tu suerte fue increíble! Pero el mercado está vacío en esa categoría. Te compensamos con el valor equivalente.'
        });
      }
      const resultadoTransaccion = await em.transactional(async (txEm) => {
        const recompensaTx = txEm.merge(recompensa);
        recompensaTx.premioConfiguracion = premioConfig;
        const jugador = await txEm.findOne(Player, jugadorGanado.id!, {
            lockMode: LockMode.PESSIMISTIC_WRITE
        });
        if (!jugador) {
          throw ErrorFactory.notFound("Jugador no encontrado durante la transacción.");
        }
        const ocupado = await txEm.count(EquipoJugador, { jugador: jugadorGanado, equipo: { torneoUsuario: { torneo: torneoId } } });
        
        if (ocupado > 0) {
          const montoCompensacion = Number(jugadorGanado.precio_actual);
          recompensaTx.jugador = undefined;
          recompensaTx.montoCompensacion = montoCompensacion;
          recompensaTx.fecha_reclamo = new Date();
          await addSaldoLocal(txEm, usuarioId, recompensaTx.torneoUsuario.torneo.id!, montoCompensacion);
          return { status: 'COMPENSACION', monto: montoCompensacion, nombre: jugador.name };
        }
        const cantidadFinal = await txEm.count(EquipoJugador, { equipo: { torneoUsuario: { usuario: usuarioId, torneo: torneoId } } });
        if (cantidadFinal >= 15) {
          throw ErrorFactory.conflict("Tu plantilla se llenó mientras girabas la ruleta.");
        }

        const equipo = await txEm.findOne(Equipo, { torneoUsuario: { usuario: usuarioId, torneo: torneoId } });
        if (!equipo) throw ErrorFactory.notFound("No tienes un equipo en este torneo.");     
        await ficharJugadorLocal(txEm, equipo.id!, jugador);
        recompensaTx.jugador = jugador;
        recompensaTx.fecha_reclamo = new Date();
        return { status: 'EXITO', jugador: jugador };
      });
      if (resultadoTransaccion.status === 'COMPENSACION') {
        return res.status(200).json({
            tipo: 'compensacion_saldo',
            montoCompensacion: resultadoTransaccion.monto,
            jugadorIntentado: resultadoTransaccion.nombre,
            mensaje: `¡Qué lástima! Alguien fichó a ${resultadoTransaccion.nombre} antes. Te acreditamos su valor.`
        });
      }
      return res.status(200).json({ 
        tipo: 'ruleta', 
        jugador: resultadoTransaccion.jugador, 
        mensaje: '¡Jugador fichado exitosamente!'
      });
    }

  if (premioConfig instanceof PlayerPick) {
    const torneoId = recompensa.torneoUsuario.torneo.id!;
    const cantidadObjetivo = premioConfig.configuracion.cantidadOpciones || 3;
    const opcionesEncontradas: number[] = [];
    const opcionesFull: Player[] = [];
    
    const cantidadJugadores = await em.count(EquipoJugador, { 
        equipo: { torneoUsuario: { usuario: usuarioId, torneo: torneoId } } 
    });
    if (cantidadJugadores >= 15) {
       throw ErrorFactory.conflict("PLANTILLA_LLENA, No tienes espacio. Vende un jugador antes de jugar.");
    }

    let intentos = 0;
    const maxIntentos = cantidadObjetivo * 5;
    let ultimoRangoReferencia: RangoPrecio | null = null; 
    while (opcionesEncontradas.length < cantidadObjetivo && intentos < maxIntentos) {
      intentos++;
      const resultado = await sortearJugador(
          em, 
          premioConfig.configuracion, 
          torneoId, 
          opcionesEncontradas
      );
      if (resultado.rangoSorteado) {
        ultimoRangoReferencia = resultado.rangoSorteado;
      }
      if (resultado.jugador) {
        opcionesEncontradas.push(resultado.jugador.id!);
        opcionesFull.push(resultado.jugador);
      }
    }
    if (opcionesEncontradas.length === 0) {
      let montoCompensacion = 5000000; 
      if (ultimoRangoReferencia) {
         if (ultimoRangoReferencia.max) {
             montoCompensacion = (Number(ultimoRangoReferencia.min) + Number(ultimoRangoReferencia.max)) / 2;
         } else {
             montoCompensacion = Number(ultimoRangoReferencia.min);
         }
      }
      await em.transactional(async (txEm) => { 
          const recompensaTx = txEm.merge(recompensa);
          recompensaTx.premioConfiguracion = premioConfig;
          await addSaldoLocal(txEm, usuarioId, recompensaTx.torneoUsuario.torneo.id!, montoCompensacion); 
          recompensaTx.montoCompensacion = montoCompensacion;
          recompensaTx.fecha_reclamo = new Date();
      });
      return res.status(200).json({ 
        tipo: 'dinero_fallback',
        montoCompensacion: montoCompensacion,
        mensaje: 'El mercado está vacío. Te compensamos con dinero.'
      });
    }
    recompensa.premioConfiguracion = premioConfig;
    recompensa.opcionesPickDisponibles = opcionesEncontradas;
    recompensa.fechaExpiracionPick = new Date(Date.now() + 5 * 60 * 1000);
    await em.flush();
    return res.status(200).json({ 
      tipo: 'pick', 
      opciones: opcionesFull,
      expira: recompensa.fechaExpiracionPick 
    });
  }
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

      await ficharJugadorLocal(txEm, equipo.id!, jugador);
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

/**
 * Agrega saldo al PRESUPUESTO DEL EQUIPO en un torneo específico.
 */
async function addSaldoLocal(em: EntityManager, usuarioId: number, torneoId: number, monto: number) {
  const equipo = await em.findOne(Equipo, { 
      torneoUsuario: { usuario: usuarioId, torneo: torneoId } 
  }, {
      lockMode: LockMode.PESSIMISTIC_WRITE
  });
  if (!equipo) {
    throw ErrorFactory.notFound("Equipo no encontrado durante la transacción.");
  }
  equipo.presupuesto = Number(equipo.presupuesto) + Number(monto);
  em.persist(equipo);
  console.log(`[TEST] Presupuesto Equipo ${equipo.id} actualizado. Nuevo monto: ${equipo.presupuesto}`);
}

/**
 * Simula el EquipoService.
 * Incorpora el jugador al equipo creando la relación.
 */
async function ficharJugadorLocal(em: EntityManager, equipoId: number, jugador: Player) {
  const equipoRef = em.getReference(Equipo, equipoId);
  const nuevoFichaje = em.create(EquipoJugador, {
    equipo: equipoRef,
    jugador: jugador,
    es_titular: false
  });
  em.persist(nuevoFichaje);
  console.log(`[TEST] Jugador ${jugador.name} fichado en Equipo ${equipoId}`);
}

export { elegirPremio, getOpcionesRecompensa, getPendientes, confirmarPick };