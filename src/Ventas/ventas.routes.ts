import { Router } from 'express';
import { requireAuth, requireAdmin } from '../Auth/auth.requires.js';
import { verificarModificacionesHabilitadas as verificarModi } from '../shared/middleware/verificarModificaciones.middleware.js';
import { crearOfertaSchema, ofertaIdParamSchema, rechazarOfertaSchema, misOfertasQuerySchema } from './ventas.schema.js';
import { crearOfertaController, aceptarOfertaController, rechazarOfertaController, cancelarOfertaController, obtenerOfertasEnviadasController, obtenerOfertasRecibidasController, obtenerDetalleOfertaController, procesarOfertasVencidasController } from './ventas.controller.js';
import { validate, validateParams, validateQuery } from '../shared/zod/validate.js';

export const ventasRouter = Router();

ventasRouter.post('/ofertar', requireAuth, verificarModi, validate(crearOfertaSchema), crearOfertaController);
ventasRouter.get('/mis-ofertas-enviadas', requireAuth, validateQuery(misOfertasQuerySchema), obtenerOfertasEnviadasController);
ventasRouter.get('/mis-ofertas-recibidas', requireAuth, validateQuery(misOfertasQuerySchema), obtenerOfertasRecibidasController);
ventasRouter.get('/:ofertaId', requireAuth, validateParams(ofertaIdParamSchema), obtenerDetalleOfertaController);
ventasRouter.post('/:ofertaId/aceptar', requireAuth, verificarModi, validateParams(ofertaIdParamSchema), aceptarOfertaController);
ventasRouter.post('/:ofertaId/rechazar', requireAuth, validateParams(ofertaIdParamSchema), validate(rechazarOfertaSchema), rechazarOfertaController);
ventasRouter.delete('/:ofertaId/cancelar', requireAuth, validateParams(ofertaIdParamSchema), cancelarOfertaController);
ventasRouter.post('/sistema/procesar-vencidas', requireAdmin, procesarOfertasVencidasController);