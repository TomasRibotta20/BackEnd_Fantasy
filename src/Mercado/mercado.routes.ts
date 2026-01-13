import { Router } from 'express';
import { requireAuth, requireAdmin } from '../Auth/auth.requires.js';
import { verificarModificacionesHabilitadas as verificarModi } from '../shared/middleware/verificarModificaciones.middleware.js';
import { inicializarJugadores, abrirMercado, cerrarMercado, obtenerMercadoActivo } from './mercado.controller.js';
import { validate, validateParams } from '../shared/zod/validate.js';
import { abrirMercadoSchema, cerrarMercadoParamsSchema, obtenerMercadoActivoParamsSchema } from './mercado.schema.js';


export const mercadoRouter = Router();
// Rutas de admin
mercadoRouter.post('/abrir', requireAdmin, validate(abrirMercadoSchema), abrirMercado);
mercadoRouter.post('/:mercadoId/cerrar', requireAdmin, validateParams(cerrarMercadoParamsSchema), cerrarMercado);

// Rutas públicas/usuarios
mercadoRouter.get('/activo/torneo/:torneoId', requireAuth, validateParams(obtenerMercadoActivoParamsSchema), obtenerMercadoActivo);