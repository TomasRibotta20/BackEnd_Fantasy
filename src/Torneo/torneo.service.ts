import { poblarEquipoAleatoriamente, crearEquipo } from '../Equipo/equipo.service.js';
import { ErrorFactory } from '../shared/errors/errors.factory.js';
import { EstadoTorneo, Torneo } from './torneo.entity.js';
import { TorneoUsuario } from './torneoUsuario.entity.js';
import { Users } from '../User/user.entity.js';
import { Equipo } from '../Equipo/equipo.entity.js';
import { inicializarJugadoresTorneo } from '../Mercado/mercado.service.js';
import { EntityManager } from '@mikro-orm/mysql';
import { EquipoJugador } from '../Equipo/equipoJugador.entity.js';
import { LockMode } from '@mikro-orm/core';


export class TorneoService {

static async join(em: EntityManager, codigo_acceso: string, nombre_equipo: string, userId: number) {
    const torneo = await em.findOneOrFail(Torneo, { codigo_acceso: codigo_acceso });

    if (torneo.estado !== EstadoTorneo.ESPERA) {
      throw ErrorFactory.conflict('El torneo ya inició. No puedes unirte.');
    }
    const inscriptos = torneo.cantidad_participantes || 0;
    if (inscriptos >= torneo.cupo_maximo) {
        throw ErrorFactory.conflict('El torneo ya está lleno.');
    }

    const yaInscrito = await em.findOne(TorneoUsuario, { torneo: torneo.id, usuario: userId });
    if (yaInscrito) {
        if (yaInscrito.expulsado) {
            throw ErrorFactory.forbidden('Has sido expulsado de este torneo y no puedes volver a unirte.');
        }
        throw ErrorFactory.duplicate('Ya estás inscrito en este torneo.');
    }
    await em.transactional(async (transactionalEm) => {
      const torneoLocked = await transactionalEm.findOne(Torneo, 
        { codigo_acceso: codigo_acceso }, 
        { lockMode: LockMode.PESSIMISTIC_WRITE } 
      );
      if (!torneoLocked) { throw ErrorFactory.notFound('Torneo no encontrado.') }
      if ((torneoLocked.cantidad_participantes || 0) >= torneoLocked.cupo_maximo) {
        throw ErrorFactory.conflict('El torneo ya está lleno.');
      }
      const nuevaInscripcion = new TorneoUsuario();
      nuevaInscripcion.usuario = transactionalEm.getReference(Users, userId);
      nuevaInscripcion.torneo = transactionalEm.getReference(Torneo, torneo.id!);
      nuevaInscripcion.rol = 'participante';
      const nuevoEquipo = crearEquipo(nombre_equipo, nuevaInscripcion);
      transactionalEm.persist([nuevaInscripcion, nuevoEquipo]);
    });

    return {
      message: '¡Te has unido exitosamente!',
      data: {
        torneo: torneo.nombre,
        mi_equipo: nombre_equipo,
        estado: 'Esperando inicio de la liga'
      }
    };
}

static async leaveTorneo(em: EntityManager, torneoId: number, userId: number) {
  const miInscripcionCheck = await em.findOne(TorneoUsuario, {
    torneo: torneoId,
    usuario: userId,
    expulsado: false
  }, { populate: ['equipo', 'torneo'] });

  if (!miInscripcionCheck) {
      throw ErrorFactory.notFound('No estás inscrito en este torneo o ya fuiste expulsado.');
  }
  const torneo = miInscripcionCheck.torneo;
  const torneoActivo = torneo.estado === EstadoTorneo.ACTIVO;
  const otrosParticipantesCount = await em.count(TorneoUsuario, {
      torneo: torneoId,
      usuario: { $ne: userId },
      expulsado: false
  });
  await em.transactional(async (transactionalEm) => {
    const miInscripcion = await transactionalEm.findOne(TorneoUsuario, {
      torneo: torneoId,
      usuario: userId,
      expulsado: false
    }, { populate: ['equipo'] });

    if (!miInscripcion) return;

    if (!torneoActivo) {
      if (miInscripcion.equipo) {
        const equipoId = miInscripcion.equipo.id;
        await transactionalEm.nativeDelete(Equipo, { id: equipoId });
      }
      if (otrosParticipantesCount === 0) {
        await transactionalEm.nativeDelete(Torneo, { id: torneoId });
      } else {
        if (miInscripcion.rol === 'creador') {
          const sucesor = await transactionalEm.findOne(TorneoUsuario, {
            torneo: torneoId,
            usuario: { $ne: userId },
            expulsado: false
          }, {
            orderBy: { fecha_inscripcion: 'ASC' }
          });

          if (sucesor) {
            sucesor.rol = 'creador';
          }
        }
        await transactionalEm.nativeDelete(TorneoUsuario, { id: miInscripcion.id }); //Posiblemente sea redundante hacer esto ya que al borrar el equipo se borra en cascada la inscripción
      }
    } else {
      if (miInscripcion.equipo) {
        const equipoId = miInscripcion.equipo.id;
        await transactionalEm.nativeDelete(EquipoJugador, { equipo: equipoId });
      }
      if (miInscripcion.rol === 'creador') {
        const sucesor = await transactionalEm.findOne(TorneoUsuario, {
          torneo: torneoId,
          usuario: { $ne: userId },
          expulsado: false
        }, {
          orderBy: { fecha_inscripcion: 'ASC' }
        });

        if (sucesor) {
          sucesor.rol = 'creador';
        }
      }
      miInscripcion.expulsado = true;
    }
  });

  return {
    message:'Has abandonado el torneo exitosamente.'
  };
}

static async start(em: EntityManager, torneoId: number, userId: number) {
    const torneo = await em.findOne(Torneo, { id: torneoId } , { populate: ['inscripciones', 'inscripciones.usuario'] });
    if (!torneo) throw ErrorFactory.notFound('Torneo no encontrado');
    if (torneo.estado !== EstadoTorneo.ESPERA) {
        throw ErrorFactory.conflict('El torneo ya ha iniciado.');
    }
    const esCreador = torneo.inscripciones.getItems().some(
        ins => ins.usuario.id === userId && ins.rol === 'creador'
    );
    if (!esCreador) throw ErrorFactory.forbidden('Solo el creador puede iniciar el torneo.');
    const inscripcionesActivas = await em.find(TorneoUsuario, {
        torneo: torneoId,
        expulsado: false
    }, { populate: ['equipo', 'usuario'] });

    await em.transactional(async (transactionalEm) => {
        await transactionalEm.nativeDelete(TorneoUsuario, {
            torneo: torneoId,
            expulsado: true
        });
        for (const inscripcion of inscripcionesActivas) {
            const equipoId = inscripcion.equipo?.id;
            if (equipoId) {
                const equipoRef = transactionalEm.getReference(Equipo, equipoId);
                equipoRef.presupuesto = 90000000; 
                await poblarEquipoAleatoriamente(equipoId, transactionalEm);
            }
        }

        console.log('Inicializando sistema de mercado...');
        await inicializarJugadoresTorneo(torneoId, transactionalEm);
        const torneoRef = transactionalEm.getReference(Torneo, torneoId);
        torneoRef.estado = EstadoTorneo.ACTIVO;
        if (!torneoRef.fecha_inicio) {
            torneoRef.fecha_inicio = new Date();
        }
    });

    return { message: '¡Torneo iniciado! El mercado está abierto y los jugadores asignados.' };
}

static async kickUser(em: EntityManager, torneoId: number, creadorId: number, targetUserId: number) {
    
    const creadorInscripcion = await em.findOne(TorneoUsuario, {
        torneo: torneoId,
        usuario: creadorId,
        rol: 'creador'
    });

    if (!creadorInscripcion) {
        throw ErrorFactory.forbidden('Solo el creador del torneo puede expulsar participantes.');
    }
    if (creadorId === targetUserId) {
        throw ErrorFactory.badRequest('No puedes expulsarte a ti mismo. Usa la opción "Abandonar torneo".');
    }
    const targetInscripcion = await em.findOne(TorneoUsuario, {
        torneo: torneoId,
        usuario: targetUserId,
        expulsado: false
    }, { populate: ['torneo', 'equipo'] });

    if (!targetInscripcion) {
        throw ErrorFactory.notFound('El usuario indicado no participa en este torneo.');
    }

    const torneo = targetInscripcion.torneo;
    const torneoActivo = torneo.estado === EstadoTorneo.ACTIVO;

    await em.transactional(async (transactionalEm) => {
        const inscripcion = await transactionalEm.findOne(TorneoUsuario, {
            torneo: torneoId,
            usuario: targetUserId,
            expulsado: false
        }, { populate: ['equipo'] });

        if (!inscripcion) return;

        if (!torneoActivo) {
            if (inscripcion.equipo) {
                const equipoId = inscripcion.equipo.id;
                inscripcion.equipo = undefined;
                await transactionalEm.persistAndFlush(inscripcion);
                await transactionalEm.nativeDelete(Equipo, { id: equipoId });
            }
            inscripcion.expulsado = true;
            transactionalEm.persist(inscripcion);
        } else {
            if (inscripcion.equipo) {
                const equipoId = inscripcion.equipo.id;
                await transactionalEm.nativeDelete(EquipoJugador, { equipo: equipoId });
            }
            inscripcion.expulsado = true;
        }
    });
    return { message: 'Participante expulsado correctamente.' };
}

}