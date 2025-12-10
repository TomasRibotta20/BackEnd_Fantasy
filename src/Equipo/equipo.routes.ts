import { Router } from 'express';
import { requireAuth, requireAdmin } from '../Auth/auth.requires.js';
import { actualizarAlineacion,getMiEquipo, realizarIntercambio, obtenerEquipos, venderJugador, cambiarEstadoJugador}  from './equipo.controller.js';
import { verificarModificacionesHabilitadas as verificarModi} from '../shared/middleware/verificarModificaciones.middleware.js';
import { getEquipoEnJornada, getHistorial, getRankingTorneoJornada } from './equipoHistorial.controller.js';
import { equipoIdParamsSchema, equipoJornadaParamsSchema, cambiarAlineacionSchema, intercambioJugadorSchema, cambiarEstadoSchema, venderJugadorSchema } from './equipo.schema.js';
import { validateParams, validate } from '../shared/zod/validate.js';


const equipoRouter = Router();

equipoRouter.get('/mi-equipo/:equipoId', requireAuth, validateParams(equipoIdParamsSchema), getMiEquipo);
equipoRouter.get('/todos', requireAdmin, obtenerEquipos);
equipoRouter.patch('/mi-equipo/:equipoId/intercambio', requireAuth, verificarModi, validateParams(equipoIdParamsSchema), validate(intercambioJugadorSchema), realizarIntercambio);
equipoRouter.patch('/mi-equipo/:equipoId/alineacion', requireAuth, verificarModi, validateParams(equipoIdParamsSchema), validate(cambiarAlineacionSchema), actualizarAlineacion);
equipoRouter.patch('/mi-equipo/:equipoId/cambiar-estado', requireAuth, verificarModi, validateParams(equipoIdParamsSchema), validate(cambiarEstadoSchema), cambiarEstadoJugador);
//Ruta para obtener todos las jornadas de un equipo
equipoRouter.get('/:equipoId/historial', requireAuth, validateParams(equipoIdParamsSchema), getHistorial);
//Ruta para obtener las puntuaciones de un equipo en una jornada
equipoRouter.get('/:equipoId/jornadas/:jornadaId', requireAuth, validateParams(equipoJornadaParamsSchema), getEquipoEnJornada);
equipoRouter.post('/mi-equipo/:equipoId/vender-jugador', requireAuth, verificarModi, validateParams(equipoIdParamsSchema), validate(venderJugadorSchema), venderJugador);
export { equipoRouter };