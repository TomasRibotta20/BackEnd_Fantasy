import { Router } from 'express';
// CAMBIO: Importa el objeto completo, no solo una función.
import { requireAuth } from '../Auth/auth.requires.js';
import { actualizarAlineacion, /*crearEquipo,*/ getMiEquipo, realizarIntercambio, obtenerEquipos }  from './equipo.controller.js';
import { verificarModificacionesHabilitadas as verificarModi} from '../shared/middleware/verificarModificaciones.middleware.js';
import { getEquipoEnJornada, getHistorial } from './equipoHistorial.controller.js';

const equipoRouter = Router();

// Aplicamos el middleware 'auth' para proteger esta ruta.
// Solo usuarios autenticados podrán crear un equipo.
// CAMBIO: Llama al método específico para 'usuario autenticado'.

//equipoRouter.post('/', requireAuth, crearEquipo);

// Ruta para obtener el equipo del usuario autenticado
equipoRouter.get('/mi-equipo/:id', requireAuth, getMiEquipo);

equipoRouter.get('/todos', obtenerEquipos);

equipoRouter.patch('/mi-equipo/:equipoId/intercambio', requireAuth, verificarModi, realizarIntercambio);
equipoRouter.patch('/mi-equipo/:equipoId/alineacion', requireAuth, verificarModi, actualizarAlineacion);
//Ruta para obtener todos las jornadas de un equipo
equipoRouter.get('/:equipoId/historial', requireAuth, getHistorial)
//Ruta para obtener las puntuaciones de un equipo en una jornada
equipoRouter.get('/:equipoId/jornadas/:jornadaId', requireAuth, getEquipoEnJornada)
export { equipoRouter };