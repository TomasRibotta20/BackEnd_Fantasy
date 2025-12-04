import { poblarEquipoAleatoriamente } from '../Equipo/equipo.service.js';
import { orm } from '../shared/db/orm.js';
import { ErrorFactory } from '../shared/errors/errors.factory.js';
import { EstadoTorneo, Torneo } from './torneo.entity.js';
import { TorneoUsuario } from './torneoUsuario.entity.js';
import { Users } from '../User/user.entity.js';
import { Equipo } from '../Equipo/equipo.entity.js';

const em = orm.em;

export class TorneoService {

static async join(codigo_acceso: string, nombre_equipo: string, userId: number) {
    const torneo = await em.findOneOrFail(Torneo, { codigo_acceso: codigo_acceso });

    if (torneo.estado !== EstadoTorneo.ESPERA) {
      throw ErrorFactory.conflict('El torneo ya inició. No puedes unirte.');
    }
    const inscritos = torneo.cantidadParticipantes || 0;
    if (inscritos >= torneo.cupoMaximo) {
        throw ErrorFactory.conflict('El torneo ya está lleno.');
    }

    const yaInscrito = await em.count(TorneoUsuario, { torneo: torneo.id, usuario: userId });
    if (yaInscrito > 0) {
        throw ErrorFactory.duplicate('Ya estás inscrito en este torneo.');
    }
    const fork = em.fork();
    await fork.transactional(async (transactionalEm) => {
      
      const nuevaInscripcion = new TorneoUsuario();
      nuevaInscripcion.usuario = transactionalEm.getReference(Users, userId);
      nuevaInscripcion.torneo = transactionalEm.getReference(Torneo, torneo.id!);
      nuevaInscripcion.rol = 'participante';
      
      const nuevoEquipo = new Equipo();
      nuevoEquipo.nombre = nombre_equipo;
      nuevoEquipo.presupuesto = 0;
      nuevoEquipo.puntos = 0;
      nuevoEquipo.torneoUsuario = nuevaInscripcion;
      nuevaInscripcion.equipo = nuevoEquipo;
      await transactionalEm.persistAndFlush([nuevaInscripcion, nuevoEquipo]);
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

static async leaveTorneo(torneoId: number, userId: number) {
  const miInscripcion = await em.findOne(TorneoUsuario, {
    torneo: torneoId,
    usuario: userId
  }, { populate: ['equipo'], fields: ['rol', 'equipo.id'] });

  if (!miInscripcion) {
      throw ErrorFactory.notFound('No estás inscrito en este torneo.');
  }

  const otrosParticipantesCount = await em.count(TorneoUsuario, {
      torneo: torneoId,
      usuario: { $ne: userId }
  });

  const fork = em.fork();

  await fork.transactional(async (transactionalEm) => {
    if (miInscripcion.equipo) {
        await transactionalEm.nativeDelete(Equipo, { id: miInscripcion.equipo.id });
    }
    if (otrosParticipantesCount === 0) {
        await transactionalEm.nativeDelete(Torneo, { id: torneoId });
    } 
    else {
        if (miInscripcion.rol === 'creador') {
            const sucesor = await transactionalEm.findOne(TorneoUsuario, {
                torneo: torneoId,
                usuario: { $ne: userId }
            }, {
                orderBy: { fecha_inscripcion: 'ASC' }
            });

            if (sucesor) {
                sucesor.rol = 'creador';
                transactionalEm.persist(sucesor); 
            }
        }
        await transactionalEm.nativeDelete(TorneoUsuario, { id: miInscripcion.id });
    }
  });

  return {
    message:'Has abandonado el torneo exitosamente.'
  };
}

// ... dentro de la clase TorneoService ...

static async start(torneoId: number, userId: number) {
    const torneo = await em.findOne(Torneo, { id: torneoId }, {
        populate: ['inscripciones', 'inscripciones.equipo']
    });

    if (!torneo) throw ErrorFactory.notFound('Torneo no encontrado');

    const esCreador = torneo.inscripciones.getItems().some(
        ins => ins.usuario.id === userId && ins.rol === 'creador'
    );
    if (!esCreador) throw ErrorFactory.forbidden('Solo el creador puede iniciar el torneo.');

    if (torneo.estado !== EstadoTorneo.ESPERA) {
        throw ErrorFactory.conflict('El torneo ya ha iniciado.');
    }

    const fork = em.fork();
    await fork.transactional(async (transactionalEm) => {
        for (const inscripcion of torneo.inscripciones) {
            const equipoId = inscripcion.equipo?.id;
            if (equipoId) {
                const equipoRef = transactionalEm.getReference(Equipo, equipoId );
                equipoRef.presupuesto = 100000000; 
                await poblarEquipoAleatoriamente(equipoId, transactionalEm);
            }
        }
        const torneoRef = transactionalEm.getReference(Torneo, torneoId);
        torneoRef.estado = EstadoTorneo.ACTIVO;
        // Si no tenía fecha, le ponemos HOY
        if (!torneoRef.fecha_inicio) {
            torneoRef.fecha_inicio = new Date();
        }
        await transactionalEm.flush();
    });

    return { message: '¡Torneo iniciado! El mercado está abierto y los jugadores asignados.' };
}
}