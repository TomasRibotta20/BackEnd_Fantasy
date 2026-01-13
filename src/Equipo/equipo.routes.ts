import { Router } from 'express';
import { requireAuth, requireAdmin } from '../Auth/auth.requires.js';
import { actualizarAlineacion, getDetalleEquipo, obtenerEquipos, venderJugador, cambiarEstadoJugador}  from './equipo.controller.js';
import { verificarModificacionesHabilitadas as verificarModi} from '../shared/middleware/verificarModificaciones.middleware.js';
import { getEquipoEnJornada, getHistorial } from './equipoHistorial.controller.js';
import { equipoIdParamsSchema, equipoJornadaParamsSchema, cambiarAlineacionSchema, cambiarEstadoSchema, venderJugadorSchema } from './equipo.schema.js';
import { validateParams, validate } from '../shared/zod/validate.js';

const equipoRouter = Router();

equipoRouter.get('/detalle-equipo/:equipoId', requireAuth, validateParams(equipoIdParamsSchema), getDetalleEquipo);
equipoRouter.get('/todos', requireAdmin, obtenerEquipos);
equipoRouter.patch('/mi-equipo/:equipoId/alineacion', requireAuth, verificarModi, validateParams(equipoIdParamsSchema), validate(cambiarAlineacionSchema), actualizarAlineacion);
equipoRouter.patch('/mi-equipo/:equipoId/cambiar-estado', requireAuth, verificarModi, validateParams(equipoIdParamsSchema), validate(cambiarEstadoSchema), cambiarEstadoJugador);
equipoRouter.get('/:equipoId/historial', requireAuth, validateParams(equipoIdParamsSchema), getHistorial);
equipoRouter.get('/:equipoId/puntos/jornadas/:jornadaId', requireAuth, validateParams(equipoJornadaParamsSchema), getEquipoEnJornada);
equipoRouter.post('/mi-equipo/:equipoId/vender-jugador', requireAuth, verificarModi, validateParams(equipoIdParamsSchema), validate(venderJugadorSchema), venderJugador);
export { equipoRouter };