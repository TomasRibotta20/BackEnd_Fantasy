import { EntityManager } from '@mikro-orm/mysql';
import { Jornada } from '../Fixture/Jornada.entity.js';
import { Torneo, EstadoTorneo } from '../Torneo/torneo.entity.js';
import { EquipoJornada } from '../Equipo/equipoJornada.entity.js';
import { Recompensa } from './recompensa.entity.js';
import { ConfigJuegoAzar, RangoPrecio, Tier } from "../Premio/premio.entity.js";
import { Player } from '../Player/player.entity.js';
import { EquipoJugador } from '../Equipo/equipoJugador.entity.js';
import { ItemMercado } from '../Mercado/itemMercado.entity.js';
import { raw } from '@mikro-orm/core';
import { ErrorFactory } from '../shared/errors/errors.factory.js';
import { LockMode } from '@mikro-orm/core';
import { Saldo } from '../Premio/saldo.entity.js';
import { Ruleta } from '../Premio/ruleta.entity.js';
import { PlayerPick } from '../Premio/playerpick.entity.js';
import { Equipo } from '../Equipo/equipo.entity.js';
import { TorneoUsuario } from '../Torneo/torneoUsuario.entity.js';
import { calcularTierPorPosicion } from './recompensa.controller.js';
import { Transaccion, TipoTransaccion } from '../Equipo/transaccion.entity.js';
import { EstadoMercado } from '../Mercado/mercadoDiario.entity.js';
import { JugadorTorneo } from '../Mercado/jugadorTorneo.entity.js';


async function generarRecompensasFinJornada(em: EntityManager, jornadaId: number) {
  const jornada = await em.findOneOrFail(Jornada, jornadaId);
  await procesarRecompensasVencidas(em, jornadaId);
  const torneosActivos = await em.find(Torneo, { estado: EstadoTorneo.ACTIVO }, { fields: ['id'] });
  if (torneosActivos.length === 0) return;
  
  let todosLosIds = torneosActivos.map(t => t.id!);
  const torneosProcesados = await em.createQueryBuilder(Recompensa, 'r')
    .select('tu.torneo_id')
    .distinct()
    .join('r.torneo_usuario', 'tu')
    .where({ 'r.jornada': jornadaId })
    .execute();
  const idsProcesados = new Set(torneosProcesados.map((Row: any) => Row.torneo_id));
  todosLosIds = todosLosIds.filter(id => !idsProcesados.has(id));
  if (todosLosIds.length === 0) {
    return;
  }
  const TAMANO_LOTE = 50;
  
  for (let i = 0; i < todosLosIds.length; i += TAMANO_LOTE) {
    const loteIds = todosLosIds.slice(i, i + TAMANO_LOTE);
    await procesarLoteTorneos(em, loteIds, jornada);
  }
  await em.flush();
}

async function procesarLoteTorneos(em: EntityManager, torneosIds: number[], jornada: Jornada) {
  const qb = em.createQueryBuilder(EquipoJornada, 'ej');

  const resultados: any[] = await qb
    .select([
      'ej.id',
      'ej.puntaje_total',
      'e.nombre as nombre_equipo',
      'tu.id as torneo_usuario_id',
      't.id as torneo_id'
    ])
    .addSelect(raw('COALESCE(SUM(CASE WHEN p.id IS NOT NULL THEN est.goles ELSE 0 END), 0) as goles_total'))
    .addSelect(raw('COALESCE(SUM(CASE WHEN p.id IS NOT NULL THEN est.asistencias ELSE 0 END), 0) as asistencias_total'))
    .join('ej.equipo', 'e')
    .join('e.torneo_usuario', 'tu') 
    .join('tu.torneo', 't')
    .join('ej.jugadores', 'pivot') 
    .join('pivot.jugador', 'j')    
    .leftJoin('j.estadisticas', 'est')
    .leftJoin('est.partido', 'p', { 'p.jornada': jornada.id }) 
    .where({
      'ej.jornada': jornada.id,
      't.id': { $in: torneosIds }
    })
    .groupBy(['ej.id', 'e.nombre', 'ej.puntaje_total', 'tu.id', 't.id'])
    .orderBy({
      't.id': 'ASC', 
      'ej.puntaje_total': 'DESC',
      [raw('goles_total')]: 'DESC',
      [raw('asistencias_total')]: 'DESC'
    })
    .execute();

  if (resultados.length === 0) return;

  const resultadosPorTorneo = new Map<number, any[]>();
  for (const row of resultados) {
    if (!resultadosPorTorneo.has(row.torneo_id)) {
      resultadosPorTorneo.set(row.torneo_id, []);
    }
    resultadosPorTorneo.get(row.torneo_id)?.push(row);
  }

  for (const [torneoId, equipos] of resultadosPorTorneo) {
    for (let index = 0; index < equipos.length; index++) {
      const posicion = index + 1;
      const inscripcionRef = em.getReference(TorneoUsuario, equipos[index].torneo_usuario_id);

      const nuevaRecompensa = em.create(Recompensa, {
        jornada: jornada,
        torneo_usuario: inscripcionRef,
        posicion_jornada: posicion,
        fecha_reclamo: null,
        premio_configuracion: null,
        monto: null,
        jugador: null
      });
      em.persist(nuevaRecompensa);
    }
  }
}

async function procesarRecompensasVencidas(em: EntityManager, jornadaActualId: number) {
  const jornadaAnteriorId = jornadaActualId - 1;
  if (jornadaAnteriorId <= 0) return;
  const recompensasVencidas = await em.find(Recompensa, {
    jornada: jornadaAnteriorId,
    fecha_reclamo: null
  }, {
    populate: ['torneo_usuario', 'torneo_usuario.usuario', 'torneo_usuario.torneo']
  });
  if (recompensasVencidas.length === 0) return;

  for (const recompensa of recompensasVencidas) {
    try {
      const tier = calcularTierPorPosicion(recompensa.posicion_jornada);
      const montoCompensacion = calcularCompensacionPorTier(tier);
      
      const usuarioId = recompensa.torneo_usuario.usuario.id!;
      const torneoId = recompensa.torneo_usuario.torneo.id!;
      await addSaldoLocal(em, usuarioId, torneoId, montoCompensacion);
      recompensa.monto_compensacion = montoCompensacion;
      recompensa.fecha_reclamo = new Date(); 
      recompensa.premio_configuracion = undefined;
      recompensa.jugador = undefined;
      recompensa.opciones_pick_disponibles = undefined;
      em.persist(recompensa);
    } catch (error) {
    }
  }
}

export interface ResultadoSorteo {
  jugador: Player | null;
  rangoSorteado: RangoPrecio;
}
/**
 * Busca un jugador válido según la configuración del premio (Ruleta/Pick)
 * Excluye jugadores que ya tienen dueño en ese torneo o están en el mercado.
 */
async function sortearJugador(em: EntityManager, config: ConfigJuegoAzar, torneoId: number, excluidosIds: number[] = []): Promise<ResultadoSorteo> {
    
  const rangoElegido = seleccionarRangoPorPeso(config.distribucion);
  const qb = em.createQueryBuilder(Player, 'j');

  qb.where({ precio_actual: { $gte: rangoElegido.min } });
  if (rangoElegido.max) {
    qb.andWhere({ precio_actual: { $lte: rangoElegido.max } });
  }

  const subQueryOcupados = em.createQueryBuilder(EquipoJugador, 'ej')
    .select('ej.jugador')
    .join('ej.equipo', 'e')
    .join('e.torneo_usuario', 'tu')
    .where({ 'tu.torneo': torneoId })
    .getKnexQuery();
  const subQueryMercado = em.createQueryBuilder(ItemMercado, 'mi')
    .select('mi.jugador')
    .join('mi.mercado', 'm')
    .where({ 
      'm.torneo': torneoId,
      'm.estado': EstadoMercado.ABIERTO
    })
    .getKnexQuery();
  qb.andWhere({ id: { $nin: subQueryOcupados } });
  qb.andWhere({ id: { $nin: subQueryMercado } });
  if (excluidosIds.length > 0) {
    qb.andWhere({ id: { $nin: excluidosIds } });
  }
  qb.orderBy({ [raw('RAND()')]: 'ASC' }).limit(1);

  const jugadorEncontrado = await qb.getSingleResult();
  
  return {
      jugador: jugadorEncontrado,
      rangoSorteado: rangoElegido
    };
}

function seleccionarRangoPorPeso(distribucion: RangoPrecio[]): RangoPrecio {
  const totalPeso = distribucion.reduce((sum, item) => sum + Number(item.peso), 0);
  let random = Math.random() * totalPeso;

  for (const item of distribucion) {
    if (random < Number(item.peso)) {
      return item;
    }
    random -= Number(item.peso);
  }
  return distribucion[0];
}

async function procesarSaldo(
  em: EntityManager,
  recompensa: Recompensa,
  premioConfig: Saldo,
  usuarioId: number
) {
  const monto = premioConfig.monto;
  const torneoId = recompensa.torneo_usuario.torneo.id!;
  
  await em.transactional(async (txEm) => {
    const recompensaTx = txEm.merge(recompensa);
    recompensaTx.premio_configuracion = premioConfig;
    await addSaldoLocal(txEm, usuarioId, torneoId, monto);
    recompensaTx.monto = monto;
    recompensaTx.fecha_reclamo = new Date();
  });
  
  return {
    tipo: 'saldo',
    monto,
    mensaje: '¡Dinero acreditado!'
  };
}

async function procesarRuleta(
  em: EntityManager,
  recompensa: Recompensa,
  premioConfig: Ruleta,
  usuarioId: number
) {
  const torneoId = recompensa.torneo_usuario.torneo.id!;
  const cantidad = await em.count(EquipoJugador, { 
    equipo: { torneo_usuario: { usuario: usuarioId, torneo: torneoId } } 
  });
  
  if (cantidad >= 15) {
    throw ErrorFactory.conflict("PLANTILLA_LLENA, No tienes espacio. Vende un jugador antes de jugar.");
  }
  const resultado = await sortearJugador(em, premioConfig.configuracion, torneoId);

  const {jugador: jugadorGanado, rangoSorteado} = resultado;
  if (!jugadorGanado) {
    let montoCompensacion: number;
    if (rangoSorteado!.max) {
      montoCompensacion = (Number(rangoSorteado!.min) + Number(rangoSorteado!.max)) / 2;
    } else {
      montoCompensacion = Number(rangoSorteado!.min);
    }
    
    await em.transactional(async (txEm) => {
      const recompensaTx = txEm.merge(recompensa);
      recompensaTx.premio_configuracion = premioConfig;
      await addSaldoLocal(txEm, usuarioId, torneoId, montoCompensacion); 
      recompensaTx.monto_compensacion = montoCompensacion;
      recompensaTx.fecha_reclamo = new Date();
    });
    
    return {
      tipo: 'dinero_fallback',
      rangoOriginal: rangoSorteado,
      montoCompensacion: montoCompensacion,
      mensaje: '¡Tu suerte fue increíble! Pero el mercado está vacío en esa categoría. Te compensamos con el valor equivalente.'
    };
  }
  
  const resultadoTransaccion = await em.transactional(async (txEm) => {
    const recompensaTx = txEm.merge(recompensa);
    recompensaTx.premio_configuracion = premioConfig;
    const jugador = await txEm.findOne(Player, jugadorGanado.id!, {
      lockMode: LockMode.PESSIMISTIC_WRITE
    });
    if (!jugador) {
      throw ErrorFactory.notFound("Jugador no encontrado.");
    }
    
    const ocupado = await txEm.count(EquipoJugador, {
      jugador: jugadorGanado,
      equipo: { torneo_usuario: { torneo: torneoId } }
    });
    
    if (ocupado > 0) {
      const montoCompensacion = Number(jugadorGanado.precio_actual);
      recompensaTx.jugador = undefined;
      recompensaTx.monto_compensacion = montoCompensacion;
      recompensaTx.fecha_reclamo = new Date();
      await addSaldoLocal(txEm, usuarioId, torneoId, montoCompensacion);
      return { status: 'COMPENSACION' as const, monto: montoCompensacion, nombre: jugador.nombre };
    }
    const cantidadFinal = await txEm.count(EquipoJugador, {
      equipo: { torneo_usuario: { usuario: usuarioId, torneo: torneoId } }
    });
    if (cantidadFinal >= 15) {
      throw ErrorFactory.conflict("Tu plantilla se llenó mientras girabas la ruleta.");
    }
    
    const equipo = await txEm.findOne(Equipo, {
      torneo_usuario: { usuario: usuarioId, torneo: torneoId }
    });
    if (!equipo) {
      throw ErrorFactory.notFound("No tienes un equipo en este torneo.");
    }
    await ficharJugadorLocal(txEm, equipo, jugador);
    recompensaTx.jugador = jugador;
    recompensaTx.fecha_reclamo = new Date();
    return { status: 'EXITO' as const, jugador: jugador };
  });
  if (resultadoTransaccion.status === 'COMPENSACION') {
    return {
      tipo: 'compensacion_saldo',
      montoCompensacion: resultadoTransaccion.monto,
      jugadorIntentado: resultadoTransaccion.nombre,
      mensaje: `¡Qué lástima! Alguien fichó a ${resultadoTransaccion.nombre} antes. Te acreditamos su valor.`
    };
  }
  return {
    tipo: 'ruleta',
    jugador: resultadoTransaccion.jugador,
    mensaje: '¡Jugador fichado exitosamente!'
  };
}

async function procesarPlayerPick(
  em: EntityManager,
  recompensa: Recompensa,
  premioConfig: PlayerPick,
  usuarioId: number
) {
  const torneoId = recompensa.torneo_usuario.torneo.id!;
  const cantidadObjetivo = premioConfig.configuracion.cantidadOpciones || 3;
  const opcionesEncontradas: number[] = [];
   const opcionesFull: Player[] = [];

  const cantidad = await em.count(EquipoJugador, { 
    equipo: { torneo_usuario: { usuario: usuarioId, torneo: torneoId } } 
  });
  if (cantidad >= 15) {
    throw ErrorFactory.conflict("PLANTILLA_LLENA, No tienes espacio. Vende un jugador antes de jugar.");
  }
  
  let intentos = 0;
  const maxIntentos = cantidadObjetivo * 5;
  let ultimoRangoReferencia: RangoPrecio | null = null;
  while (opcionesEncontradas.length < cantidadObjetivo && intentos < maxIntentos) {
    intentos++;
    const resultado = await sortearJugador(em, premioConfig.configuracion, torneoId, opcionesEncontradas);
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
      recompensaTx.premio_configuracion = premioConfig;
      await addSaldoLocal(txEm, usuarioId, torneoId, montoCompensacion);
      recompensaTx.monto_compensacion = montoCompensacion;
      recompensaTx.fecha_reclamo = new Date();
    });
    
    return {
      tipo: 'dinero_fallback',
      montoCompensacion: montoCompensacion,
      mensaje: 'El mercado está vacío. Te compensamos con dinero.'
    };
  }
  recompensa.premio_configuracion = premioConfig;
  recompensa.opciones_pick_disponibles = opcionesEncontradas;
  recompensa.fecha_expiracion_pick = new Date(Date.now() + 5 * 60 * 1000);
  await em.flush();
  return {
    tipo: 'pick',
    opciones: opcionesFull,
    expira: recompensa. fecha_expiracion_pick! ,
    mensaje: 'Elige tu jugador'
  };
}

async function procesarPicksExpiradosDelUsuario(em: EntityManager, usuarioId: number) {
  const picksExpirados = await em.find(Recompensa, {
      torneo_usuario: { usuario: usuarioId },
    fecha_reclamo: null,
    fecha_expiracion_pick: { $lt: new Date() },
    opciones_pick_disponibles: { $nin: [] }
  }, {
    populate: ['torneo_usuario.torneo', 'premio_configuracion']
  });

  if (picksExpirados.length === 0) {
    return;
  }
  for (const recompensa of picksExpirados) {
    await procesarPickExpirado(em, recompensa, usuarioId);
  }
  await em.flush();
}

async function procesarPickExpirado(
  em: EntityManager,
  recompensa: Recompensa,
  usuarioId: number
) {
  const torneoId = recompensa.torneo_usuario.torneo.id!;
  const tier = calcularTierPorPosicion(recompensa.posicion_jornada);

  const montoCompensacion = calcularCompensacionPorTier(tier);
  await em.transactional(async (txEm) => {
    const recompensaTx = txEm.merge(recompensa);
    await addSaldoLocal(txEm, usuarioId, torneoId, montoCompensacion);
    recompensaTx.monto_compensacion = montoCompensacion;
    recompensaTx.fecha_reclamo = new Date();
    recompensaTx.opciones_pick_disponibles = undefined;
    recompensaTx.fecha_expiracion_pick = undefined;
  });
}

function calcularCompensacionPorTier(tier: Tier): number {
  const compensaciones: Record<Tier, number> = {
    [Tier.ORO]: 5000000,
    [Tier.PLATA]: 2000000,
    [Tier.BRONCE]: 500000
  };
  return compensaciones[tier] || 500000;
}

async function addSaldoLocal(em: EntityManager, usuarioId: number, torneoId: number, monto: number) {
  const equipo = await em.findOneOrFail(Equipo, { 
      torneo_usuario: { usuario: usuarioId, torneo: torneoId } 
  }, {
      lockMode: LockMode.PESSIMISTIC_WRITE
  });
  const transaccion = em.create(Transaccion, {
        equipo,
        tipo: TipoTransaccion.PREMIO,
        monto,
        jugador: null,
        fecha: new Date(),
        descripcion: `Acreditación de saldo por recompensa de torneo ID: ${torneoId}`
      });
  equipo.presupuesto = Number(equipo.presupuesto) + Number(monto);
  em.persist(equipo);
  em.persist(transaccion);
}

/**
 * Simula el EquipoService.
 * Incorpora el jugador al equipo creando la relación.
 */
async function ficharJugadorLocal(em: EntityManager, equipo: Equipo, jugador: Player) {
  const nuevoFichaje = em.create(EquipoJugador, {
    equipo: equipo,
    jugador: jugador,
    es_titular: false,
    fecha_incorporacion: new Date(),
    valor_clausula: 0
  });
  em.persist(nuevoFichaje);
  const jugadorTorneo = await em.findOne(JugadorTorneo, {
          jugador: jugador.id,
          torneo: equipo.torneo_usuario.torneo.id
        });
  if (jugadorTorneo) {
    jugadorTorneo.equipo_jugador = nuevoFichaje;
  }
  const transaccion = em.create(Transaccion, {
        equipo,
        tipo: TipoTransaccion.PREMIO,
        monto: null,
        jugador,
        fecha: new Date(),
        descripcion: `Fichaje por recompensa de jugador pick: ${jugador.nombre}`
      });
  em.persist(transaccion);
}

export { procesarSaldo, procesarRuleta, generarRecompensasFinJornada, sortearJugador, procesarPlayerPick, procesarPicksExpiradosDelUsuario, ficharJugadorLocal, addSaldoLocal };