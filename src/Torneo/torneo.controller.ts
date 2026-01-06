import { Request, Response, NextFunction } from 'express';
import { orm } from '../shared/db/orm.js';
import { AppError, ErrorFactory } from '../shared/errors/errors.factory.js';
import { EstadoTorneo, Torneo } from './torneo.entity.js';
import { TorneoUsuario } from './torneoUsuario.entity.js';
import { Users } from '../User/user.entity.js';
import { FilterQuery } from '@mikro-orm/core';
import { TorneoService } from './torneo.service.js';
import { crearEquipo } from '../Equipo/equipo.service.js';
import { GameConfig } from '../Config/gameConfig.entity.js';
import { Equipo } from '../Equipo/equipo.entity.js';

const em = orm.em;

/**
 * Recupera todos los torneos con filtros para administradores.
 * @param req El objeto de solicitud de Express que contiene los filtros en query.
 * @param res El objeto de respuesta de Express para enviar los resultados.
 * @returns Una respuesta HTTP 200 con un mensaje y una lista de torneos filtrados, o un error HTTP 500 si falla.
 */
async function findAll(req: Request, res: Response, next: NextFunction) {
  try {
    const { 
      estado, 
      fecha_creacion_desde, 
      fecha_creacion_hasta, 
      min_participantes, 
      max_participantes,
      limit,
      offset 
    } = req.query; 
    
    const filtros: any = {};

    if (estado) {
      filtros.estado = estado as EstadoTorneo;
    }

    const desde = fecha_creacion_desde ? new Date(fecha_creacion_desde as string) : undefined;
    const hasta = fecha_creacion_hasta ? new Date(fecha_creacion_hasta as string) : undefined;
    if (desde && hasta && desde > hasta) {
      throw ErrorFactory.badRequest('Rango de fechas inválido: "fechas desde" no puede ser mayor que "fechas hasta".');
    }

    if (desde || hasta) {
      filtros.fecha_creacion = {};
      if (desde) filtros.fecha_creacion.$gte = desde;
      if (hasta) filtros.fecha_creacion.$lte = hasta;
    }

    if (min_participantes || max_participantes) {
       filtros.cantidadParticipantes = {};
       if (min_participantes) {
         filtros.cantidadParticipantes.$gte = Number(min_participantes);
       } 
       if (max_participantes) {
         filtros.cantidadParticipantes.$lte = Number(max_participantes);
       }
    }

    const [torneos, total] = await em.findAndCount(Torneo, filtros, {//Si hay muchos torneos es mejor usar queryBuilder y no de pepender de la @Formula de la cantidad de participantes.
      orderBy: { fecha_creacion: 'DESC' },
      limit: Number(limit) || 20,
      offset: Number(offset) || 0
    });
    
    
    res.status(200).json({ 
      message: 'Torneos encontrados exitosamente', 
      data: torneos,
      total: total,
      filtros: { estado, fecha_creacion_desde, fecha_creacion_hasta, min_participantes, max_participantes }
    });
    
  } catch (error: any) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(ErrorFactory.internal('Error al obtener los torneos'));
    }
  }
}

/**
 * Recupera un torneo específico con detalles para administradores.
 * @param req El objeto de solicitud de Express que contiene el ID del torneo en los parámetros.
 * @param res El objeto de respuesta de Express para enviar los resultados.
 * @returns Una respuesta HTTP 200 con un mensaje y los detalles del torneo, o un error HTTP 500, 404 si falla.
 */
async function findOne(req: Request, res: Response, next: NextFunction) {
  try {
    const torneoId = Number(req.params.id);
    const torneo = await em.findOneOrFail(Torneo, { id: torneoId });

    const ordenamiento: any = torneo.estado === EstadoTorneo.ESPERA
        ? { id: 'ASC' } 
        : [
            { expulsado: 'ASC' },
            { equipo: { puntos: 'DESC' } }
          ];

    const itemsInscripciones = await em.find(TorneoUsuario, {
        torneo: torneoId
    }, {
        populate: ['usuario', 'equipo'],
        orderBy: ordenamiento
    });

    const inscripcionCreador = itemsInscripciones.find(i => 
      i.rol === 'creador' || i.rol === 'CREADOR'
    );
    
    const datosCreador = {
      id: inscripcionCreador?.usuario.id,
      username: inscripcionCreador?.usuario.username || 'Desconocido',
      email: inscripcionCreador?.usuario.email || 'No disponible',
      fecha_ingreso: inscripcionCreador?.fecha_inscripcion
    };

    const listaParticipantes = itemsInscripciones.map(ins => {
      let estadoLabel = 'ACTIVO';
      if (ins.expulsado) estadoLabel = 'EXPULSADO';
      else if (ins.rol === 'creador') estadoLabel = 'CREADOR';
      return {
        inscripcion_id: ins.id,
        usuario: {
          id: ins.usuario.id,
          username: ins.usuario.username,
          email: ins.usuario.email,
          rol: ins.rol
        },
        equipo: {
          id: ins.equipo?.id || null,
          nombre: ins.equipo?.nombre || (ins.expulsado ? 'Equipo Eliminado' : 'Sin Equipo'),
          puntos: ins.equipo?.puntos || 0,
          presupuesto: ins.equipo?.presupuesto || 0,
        },
        estado: estadoLabel,
        es_expulsado: ins.expulsado,
        fecha_inscripcion: ins.fecha_inscripcion
      };
    });

    const totalInscritos = itemsInscripciones.length;
    const activos = itemsInscripciones.filter(i => !i.expulsado).length;
    const expulsados = itemsInscripciones.filter(i => i.expulsado).length;

    res.status(200).json({
      message: 'Detalle de torneo para Administración',
      data: {
        info_basica: {
          id: torneo.id, 
          nombre: torneo.nombre,
          codigo_acceso: torneo.codigo_acceso,
          estado: torneo.estado,
          cupo_maximo: torneo.cupoMaximo,
          resumen_ocupacion: {
              total_registros: totalInscritos,
              activos: activos,
              expulsados: expulsados
          }
        },
        fechas: {
          inicio: torneo.fecha_inicio,
          creacion: torneo.fecha_creacion
        },
        responsable: datosCreador,
        participantes: listaParticipantes
      }
    });

  } catch (error: any) {
    if (error.name === 'NotFoundError') {
      return next(ErrorFactory.notFound('Torneo no encontrado'));
    }
    next(ErrorFactory.internal('Error al obtener el torneo para admin'));
  }
}

/** Crea un nuevo torneo y asigna al usuario autenticado como creador.
 * @param req El objeto de solicitud de Express que contiene los datos del torneo en el cuerpo.
 * @param res El objeto de respuesta de Express para enviar los resultados.
 * @returns Una respuesta HTTP 201 con un mensaje y los datos del torneo creado, o un error HTTP 500 si falla.
 */
async function add(req: Request, res: Response, next: NextFunction) {
  try {
    const { 
      nombre,
      nombre_equipo,
      cupoMaximo, 
      fecha_inicio,
      descripcion
    } = req.body;
    
    const currentUserId = req.authUser.user?.userId;

    const config = await em.findOne(GameConfig, 1);
    const cupoMaximoGlobal = config?.cupoMaximoTorneos || 8;

    if (cupoMaximo > cupoMaximoGlobal) {
      throw ErrorFactory.badRequest(
        `El cupo máximo del torneo (${cupoMaximo}) no puede exceder el límite global configurado (${cupoMaximoGlobal})`
      );
    }

    const nuevoTorneo = new Torneo();
    nuevoTorneo.nombre = nombre;
    nuevoTorneo.descripcion = descripcion;
    if (fecha_inicio) nuevoTorneo.fecha_inicio = new Date(fecha_inicio);
    nuevoTorneo.cupoMaximo = cupoMaximo || 5;
    nuevoTorneo.estado = EstadoTorneo.ESPERA;
    nuevoTorneo.codigo_acceso = generateRandomCode();

    const inscripcionAdmin = new TorneoUsuario();
    if (currentUserId) inscripcionAdmin.usuario = em.getReference(Users, currentUserId);
    inscripcionAdmin.torneo = nuevoTorneo;
    inscripcionAdmin.rol = 'creador';
    const equipoAdmin = crearEquipo(nombre_equipo, inscripcionAdmin)
    inscripcionAdmin.equipo = equipoAdmin;
    equipoAdmin.torneoUsuario = inscripcionAdmin;

    em.persist([nuevoTorneo, inscripcionAdmin, equipoAdmin]);

    let intentos = 0;
    const maxIntentos = 3;
    let guardadoExitoso = false;
    while (intentos < maxIntentos && !guardadoExitoso) {
        try {
            await em.flush();
            guardadoExitoso = true;  
        } catch (error: any) {
            if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
              nuevoTorneo.codigo_acceso = generateRandomCode();
              intentos++;
            } else {
              throw error; 
            }
        }       
    }
    if (!guardadoExitoso) {
        throw ErrorFactory.internal('No se pudo generar un código de acceso único para el torneo');
    }
    res.status(201).json({ 
      message: 'Torneo creado exitosamente', 
      data: {
        id: nuevoTorneo.id,
        nombre: nuevoTorneo.nombre,
        codigo_acceso: nuevoTorneo.codigo_acceso,
        estado: nuevoTorneo.estado,
        fecha_inicio: nuevoTorneo.fecha_inicio || 'Por definir' 
      }
    })
  } catch (error: any) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(ErrorFactory.internal('Error al crear el torneo'));
    }
  }
}

/** Actualiza un torneo existente.
 * @param req El objeto de solicitud de Express que contiene el ID del torneo en los parámetros y los datos a actualizar en el cuerpo.
 * @param res El objeto de respuesta de Express para enviar los resultados.
 * @returns Una respuesta HTTP 200 con un mensaje de éxito, o un error HTTP 500, 409, 404 si falla.
 */
async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const torneoId = Number(req.params.id);
    const { nombre, cupoMaximo, fecha_inicio, codigo_acceso } = req.body;
    const currentUserId = req.authUser.user?.userId;
    const globalRole = req.authUser.user?.role;

    let esSuperAdmin = false;
    if (globalRole === 'admin') {
        esSuperAdmin = true;
    }
    const torneo = await em.findOne(Torneo, { id: torneoId });
    if (!torneo) throw ErrorFactory.notFound('Torneo no encontrado');
    
    let esCreador = false;
    if (!esSuperAdmin) {
        const count = await em.count(TorneoUsuario, {
            torneo: torneoId,
            usuario: currentUserId,
            rol: 'creador'
        });
        esCreador = count > 0;
    }
    if (!esSuperAdmin && !esCreador) {
        throw ErrorFactory.forbidden('No tienes permisos para modificar este torneo');
    }
    if (nombre) torneo.nombre = nombre;
    if (cupoMaximo) {
        if (torneo.estado !== EstadoTorneo.ESPERA) {
            throw ErrorFactory.badRequest('No puedes cambiar el cupo de un torneo ya iniciado.');
        }
         
        const config = await em.findOne(GameConfig, 1);
        const cupoMaximoGlobal = config?.cupoMaximoTorneos || 5;
        
        if (cupoMaximo > cupoMaximoGlobal) {
            throw ErrorFactory.badRequest(
                `El cupo máximo del torneo (${cupoMaximo}) no puede exceder el límite global configurado (${cupoMaximoGlobal})`
            );
        }

        const inscritosActuales = torneo.cantidadParticipantes || 0; 
        if (cupoMaximo < inscritosActuales) {
            throw ErrorFactory.badRequest(`El cupo máximo no puede ser menor a los participantes actuales (${inscritosActuales}).`);
        }
        torneo.cupoMaximo = cupoMaximo;
    }
    if (fecha_inicio) {
        if (torneo.estado !== EstadoTorneo.ESPERA) {
            throw ErrorFactory.badRequest('No puedes cambiar la fecha de un torneo ya iniciado.');
        }
        torneo.fecha_inicio = new Date(fecha_inicio);
    }
    if (codigo_acceso) {
        if (!esSuperAdmin) {
            throw ErrorFactory.forbidden('Solo el administrador del sistema puede cambiar el código de acceso manualmente.');
        }
        torneo.codigo_acceso = codigo_acceso;
    }

    await em.flush();

    res.status(200).json({ 
        message: 'Torneo actualizado', 
        data: torneo 
    });

  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
      return next(ErrorFactory.duplicate('El código de acceso ya existe.'));
    } else if (error instanceof AppError) {
      next(error);
    } else {
      next(ErrorFactory.internal('Error al actualizar el torneo'));
    }
  }
}

/** Elimina un torneo existente.
 * @param req El objeto de solicitud de Express que contiene el ID del torneo en los parámetros.
 * @param res El objeto de respuesta de Express para enviar los resultados.
 * @returns Una respuesta HTTP 200 con un mensaje de éxito, o un error HTTP 500 si falla.
 */
async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const torneoId = Number(req.params.id);
    
    await em.transactional(async (transactionalEm) => {
      const inscripciones = await transactionalEm.find(TorneoUsuario, 
        { torneo: torneoId, equipo: { $ne: null } }, 
        { populate: ['equipo'] }
      );
      
      const idsEquipos = inscripciones
        .map(i => i.equipo?.id)
        .filter((id): id is number => id !== undefined);

      if (idsEquipos.length > 0) {  
        await transactionalEm.nativeDelete(Equipo, { id: { $in: idsEquipos } });
      }   
      await transactionalEm.nativeDelete(Torneo, { id: torneoId });
    });
    
    res.status(200).json({ message: 'Torneo y equipos eliminados.' });
  } catch (error: any) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(ErrorFactory.internal('Error al eliminar el torneo'));
    }
  }
}

async function validateAccessCode(req: Request, res: Response, next: NextFunction) {
  try {
    const { codigo_acceso } = req.body; 
    const currentUserId = req.authUser.user?.userId;

    const torneo = await em.findOneOrFail(Torneo, { codigo_acceso: codigo_acceso });
    
    if (torneo.estado !== EstadoTorneo.ESPERA) {
        throw ErrorFactory.conflict('El torneo ya ha comenzado, no se permiten nuevas inscripciones.');
    }
    const inscritos = torneo.cantidadParticipantes || 0;
    if (inscritos >= torneo.cupoMaximo) {
        throw ErrorFactory.conflict('El torneo ya está lleno, no se permiten nuevas inscripciones.');
    }
    if (currentUserId) {
        const inscripcion = await em.findOne(TorneoUsuario, { torneo: torneo.id, usuario: currentUserId });
        if (inscripcion) {
            throw ErrorFactory.duplicate('Ya estás inscrito en este torneo.');
        }
    }
    res.status(200).json({
        message: 'Código válido',
        data: {
            torneo_id: torneo.id,
            codigo_acceso: torneo.codigo_acceso,
            nombre: torneo.nombre,
            cupos: {
                ocupados: inscritos,
                maximo: torneo.cupoMaximo
            }
        }
    });

  } catch (error: any) {
    if (error.name === 'NotFoundError') {
      next(ErrorFactory.notFound('Código de acceso inválido'));
    } else if (error instanceof AppError) {
      next(error);
    } else {
      next(ErrorFactory.internal('Error al validar código'));
    }
  }
}

async function getMisTorneos(req: Request, res: Response, next: NextFunction) {
  try {
    const currentUserId = req.authUser.user?.userId;
    const { estado } = req.query;

    const where: FilterQuery<TorneoUsuario> = {
        usuario: currentUserId
    };
    if (estado) {
        where.torneo = { estado: estado as EstadoTorneo };
    }

    const inscripciones = await em.find(TorneoUsuario, where, {
    populate: ['torneo', 'equipo'], 
    orderBy: [
        { torneo: { estado: 'ASC' } },
        { torneo: { fecha_creacion: 'DESC' } }
    ]
    });
    const data = inscripciones.map(ins => {
        return {
            torneo_id: ins.torneo.id,
            nombre: ins.torneo.nombre,
            estado: ins.torneo.estado,
            codigo_acceso: ins.torneo.codigo_acceso,
            mi_rol: ins.rol,
            mi_equipo: ins.equipo ? {
                id: ins.equipo.id,
                nombre: ins.equipo.nombre,
                puntos: ins.equipo.puntos,
                presupuesto: ins.equipo.presupuesto 
            } : null,
            
            cant_participantes: ins.torneo.cantidadParticipantes,
            cupo_maximo: ins.torneo.cupoMaximo,
        };
    });

    res.status(200).json({
        message: 'Mis torneos obtenidos exitosamente',
        data: data
    });

  } catch (error: any) {
    next(ErrorFactory.internal('Error al obtener mis torneos'));
  }
}

async function getTorneoUsuario(req: Request, res: Response, next: NextFunction) {
  try {
    const torneoId = Number(req.params.id);
    const currentUserId = req.authUser.user?.userId;

    const torneo = await em.findOneOrFail(Torneo, { id: torneoId }, {
        fields: ['nombre', 'estado', 'codigo_acceso', 'cupoMaximo', 'cantidadParticipantes']
    });

    const miInscripcion = await em.findOne(TorneoUsuario, {
        torneo: torneoId,
        usuario: currentUserId
    }, { 
        populate: ['equipo'],
        fields: ['rol', 'equipo.id'] 
    });

    if (!miInscripcion) {
        throw ErrorFactory.forbidden('No tienes acceso a este torneo.');
    }
    const miEquipoId = miInscripcion?.equipo?.id || null;
    const soyCreador = miInscripcion?.rol === 'creador';

    const ordenamiento: any = torneo.estado === EstadoTorneo.ESPERA
        ? { id: 'ASC' } 
        : { equipo: { puntos: 'DESC' } };

    const participantes = await em.find(TorneoUsuario, {
        torneo: torneoId
    }, {
        orderBy: ordenamiento,
        populate: ['usuario', 'equipo'],
        fields: [
            'rol',
            'usuario.username', 'usuario.id',
            'equipo.id', 'equipo.nombre', 'equipo.puntos'
        ]
    });

    const listaVisual = participantes.map((ins, index) => ({
        pos: index + 1,
        usuario_id: ins.usuario.id,
        usuario: ins.usuario.username,
        equipo_id: ins.equipo?.id || null,
        nombre_equipo: ins.equipo?.nombre || 'Sin Equipo',
        puntos: ins.equipo?.puntos || 0,
        es_mi_equipo: ins.usuario.id === currentUserId,
        es_admin: ins.rol === 'creador'
    }));

    res.status(200).json({
        data: {
            id: torneo.id,
            nombre: torneo.nombre,
            estado: torneo.estado,
            codigo: torneo.codigo_acceso,
            mi_equipo_id: miEquipoId,
            soy_admin: soyCreador,
            participantes: listaVisual
        }
    });

  } catch (error: any) {
    if (error.name === 'NotFoundError') {
      next(ErrorFactory.notFound('Torneo no encontrado'));
    } else if (error instanceof AppError) {
      next(error);
    } else {
      next(ErrorFactory.internal('Error al cargar torneo'));
    }
  }
}

async function joinTorneo(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await TorneoService.join(em, req.body.codigo_acceso, req.body.nombre_equipo, req.authUser.user?.userId!);
    res.status(201).json(result);
  } catch (error: any) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(ErrorFactory.internal('Error al unirse al torneo'));
    }
  }
}

async function leave(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await TorneoService.leaveTorneo(em, Number(req.params.id), req.authUser.user?.userId!);
    res.status(200).json(result);
  } catch (error: any) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(ErrorFactory.internal('Error al abandonar el torneo'));
    }
  }
}

async function iniciarTorneo(req: Request, res: Response, next: NextFunction) {
  try {
    const torneoId = Number(req.params.id);
    const userId = req.authUser.user?.userId!;
    const result = await TorneoService.start(em, torneoId, userId);
    res.status(200).json(result);
  } catch (error: any) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(ErrorFactory.internal('Error al iniciar el torneo'));
    }
  }
}

async function expulsar(req: Request, res: Response, next: NextFunction) {
  try {
    const torneoId = Number(req.params.id);
    const targetUserId = Number(req.params.userId); 
    
    const creadorId = req.authUser.user?.userId!;

    const result = await TorneoService.kickUser(em, torneoId, creadorId, targetUserId);
    res.status(200).json(result);
  } catch (error: any) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(ErrorFactory.internal('Error al expulsar participante'));
    }
  }
}

function generateRandomCode(length = 6): string {
   const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
   let result = '';
   for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
   }
   return result;
}

export { findAll, findOne, add, update, remove, validateAccessCode, getMisTorneos, getTorneoUsuario, joinTorneo, leave, iniciarTorneo, expulsar };