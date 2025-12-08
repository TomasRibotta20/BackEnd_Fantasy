import { Router } from 'express';
import { requireAuth } from '../Auth/auth.requires.js';

import { crearOfertaSchema, ofertaIdParamSchema, rechazarOfertaSchema, misOfertasQuerySchema } from './ventas.schema.js';
import { crearOfertaController, aceptarOfertaController, rechazarOfertaController, cancelarOfertaController, obtenerOfertasEnviadasController, obtenerOfertasRecibidasController, obtenerDetalleOfertaController, procesarOfertasVencidasController } from './ventas.controller.js';

export const ventasRouter = Router();

// Crear o actualizar oferta
ventasRouter.post('/ofertar',requireAuth,crearOfertaController);

// Obtener ofertas enviadas
ventasRouter.get('/mis-ofertas-enviadas',requireAuth,obtenerOfertasEnviadasController);

// Obtener ofertas recibidas
ventasRouter.get('/mis-ofertas-recibidas',requireAuth,obtenerOfertasRecibidasController);

// Obtener detalle de una oferta
ventasRouter.get('/:ofertaId',requireAuth,obtenerDetalleOfertaController);

// Aceptar oferta
ventasRouter.post('/:ofertaId/aceptar',requireAuth,aceptarOfertaController);

// Rechazar oferta
ventasRouter.post('/:ofertaId/rechazar',requireAuth,rechazarOfertaController);

// Cancelar oferta
ventasRouter.delete('/:ofertaId/cancelar',requireAuth,cancelarOfertaController);

// Procesar ofertas vencidas (para cron job o admin)
ventasRouter.post('/sistema/procesar-vencidas',procesarOfertasVencidasController);