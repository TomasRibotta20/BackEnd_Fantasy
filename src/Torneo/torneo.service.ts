import { poblarEquipoAleatoriamente } from '../Equipo/equipo.service.js';
import { orm } from '../shared/db/orm.js';
import { ErrorFactory } from '../shared/errors/errors.factory.js';
import { EstadoTorneo, Torneo } from './torneo.entity.js';
import { TorneoUsuario } from './torneoUsuario.entity.js';
import { Users } from '../User/user.entity.js';
import { Equipo } from '../Equipo/equipo.entity.js';
import { EquipoJugador } from '../Equipo/equipoJugador.entity.js';
import { inicializarJugadoresTorneo } from '../Mercado/mercado.service.js';

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
        const equipoId = miInscripcion.equipo.id;
        await transactionalEm.nativeDelete(EquipoJugador, { equipo: equipoId });
        await transactionalEm.nativeDelete(Equipo, { id: equipoId });
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
        // 1. Poblar equipos con jugadores
        for (const inscripcion of torneo.inscripciones) {
            const equipoId = inscripcion.equipo?.id;
            if (equipoId) {
                const equipoRef = transactionalEm.getReference(Equipo, equipoId);
                equipoRef.presupuesto = 90000000; 
                await poblarEquipoAleatoriamente(equipoId, transactionalEm);
            }
        }

        // 2. Inicializar JugadorTorneo y relacionar jugadores asignados
        console.log('Inicializando sistema de mercado...');
        await inicializarJugadoresTorneo(torneoId, transactionalEm);

        // 3. Cambiar estado del torneo
        const torneoRef = transactionalEm.getReference(Torneo, torneoId);
        torneoRef.estado = EstadoTorneo.ACTIVO;
        
        if (!torneoRef.fecha_inicio) {
            torneoRef.fecha_inicio = new Date();
        }
        
        await transactionalEm.flush();
    });

    return { message: '¡Torneo iniciado! El mercado está abierto y los jugadores asignados.' };
}

static async kickUser(torneoId: number, creadorId: number, targetUserId: number) {
    
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
        usuario: targetUserId
    }, { populate: ['equipo'] });

    if (!targetInscripcion) {
        throw ErrorFactory.notFound('El usuario indicado no participa en este torneo.');
    }
    const fork = em.fork();
    await fork.transactional(async (transactionalEm) => {
        if (targetInscripcion.equipo) {
            const equipoId = targetInscripcion.equipo.id;
            await transactionalEm.nativeDelete(EquipoJugador, { equipo: equipoId });
            await transactionalEm.nativeDelete(Equipo, { id: equipoId });
        }
        await transactionalEm.nativeDelete(TorneoUsuario, { id: targetInscripcion.id });
    });
    return { message: 'Participante expulsado correctamente.' };
}

}