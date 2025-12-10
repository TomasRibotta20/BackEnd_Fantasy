import { Router } from 'express';
import { requireAuth } from '../Auth/auth.requires.js';
import { ofertar, cancelarOferta, obtenerMisOfertas } from './mercadoPuja.controller.js';
import { ofertarSchema, cancelarOfertaParamsSchema, obtenerMisOfertasParamsSchema } from './mercadoPuja.schema.js';
import { validate, validateParams, validateQuery } from '../shared/zod/validate.js';

export const mercadoPujaRouter = Router();

// Crear/actualizar oferta
mercadoPujaRouter.post('/equipo/:equipoId/ofertar', requireAuth, validate(ofertarSchema), validateParams(obtenerMisOfertasParamsSchema), ofertar);

// Cancelar oferta
mercadoPujaRouter.delete('/puja/:pujaId/cancelar', requireAuth, validateParams(cancelarOfertaParamsSchema), cancelarOferta);

// Ver mis ofertas
mercadoPujaRouter.get('/equipo/:equipoId/mis-ofertas', requireAuth, validateParams(obtenerMisOfertasParamsSchema), obtenerMisOfertas);