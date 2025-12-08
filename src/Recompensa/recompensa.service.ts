import { EntityManager } from '@mikro-orm/mysql';
import { Jornada } from '../Fixture/Jornada.entity.js';
import { Torneo, EstadoTorneo } from '../Torneo/torneo.entity.js';
import { EquipoJornada } from '../Equipo/equipoJornada.entity.js';
import { Recompensa } from './recompensa.entity.js';
import { ConfigJuegoAzar, RangoPrecio } from "../Premio/premio.entity.js";
import { Player } from '../Player/player.entity.js';
import { EquipoJugador } from '../Equipo/equipoJugador.entity.js';
//import { MercadoItem } from '../Mercado/mercadoItem.entity.js';+
import { raw } from '@mikro-orm/core';

async function generarRecompensasFinJornada(em: EntityManager, jornadaId: number) {

  const jornada = await em.findOneOrFail(Jornada, jornadaId);
  const torneos = await em.find(Torneo, { estado: EstadoTorneo.ACTIVO });

  for (const torneo of torneos) {
    await procesarTorneo(em, torneo, jornada);
  }
  await em.flush();
}

async function procesarTorneo(em: EntityManager, torneo: Torneo, jornada: Jornada) {
  const resultados = await em.find(EquipoJornada, 
    { 
      jornada: jornada,
      equipo: { torneoUsuario: { torneo: torneo } }
    }, 
    {
      orderBy: { 
        puntajeTotal: 'DESC', // 1. Quien hizo más puntos
        // goles_favor: 'DESC', // 2. (Opcional) Quien hizo más goles reales
        // equipo: { valor: 'ASC' } // 3. (Opcional) Equipo más humilde gana empate
      },
      populate: ['equipo.torneoUsuario.usuario'] 
    }
  );

  if (resultados.length === 0) return;

  for (let index = 0; index < resultados.length; index++) {
    const resultado = resultados[index];
    const posicion = index + 1;
    const inscripcion = resultado.equipo.torneoUsuario;

    const nuevaRecompensa = em.create(Recompensa, {
      jornada: jornada,
      torneoUsuario: inscripcion,
      posicionJornada: posicion,
      fecha_reclamo: null,
      premioConfiguracion: null,
      monto: null,
      jugador: null
    });
    em.persist(nuevaRecompensa);
  }
}

export interface ResultadoSorteo {
  jugador: Player | null;      // Puede ser null si el pool está vacío
  rangoSorteado: RangoPrecio;   // El rango que tocó (ej: min 10M)
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
    .join('e.torneoUsuario', 'tu')
    .where({ 'tu.torneo': torneoId })
    .getKnexQuery();
  /*
  const subQueryMercado = em.createQueryBuilder(MercadoItem, 'mi')
    .select('mi.jugador')
    .where({ 'mi.activo': true, 'mi.torneo': torneoId })//////////////////////////////////////
    .getKnexQuery();
  */
  qb.andWhere({ id: { $nin: subQueryOcupados } });
  //qb.andWhere({ id: { $nin: subQueryMercado } });

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

export { generarRecompensasFinJornada, sortearJugador };