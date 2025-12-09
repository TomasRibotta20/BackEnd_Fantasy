import { Router } from 'express';
import { requireAuth } from '../Auth/auth.requires.js';
import { requireAdmin } from '../Auth/auth.requires.js';
import { verificarModificacionesHabilitadas as verificarModi } from '../shared/middleware/verificarModificaciones.middleware.js';
import {abrirMercado,cerrarMercado,obtenerMercadoActivo} from './mercado.controller.js';


export const mercadoRouter = Router();

// Rutas de admin
mercadoRouter.post('/abrir', requireAdmin, abrirMercado);
mercadoRouter.post('/:mercadoId/cerrar', requireAdmin,verificarModi, cerrarMercado);

// Rutas públicas/usuarios
mercadoRouter.get('/activo/:torneoId', requireAuth,obtenerMercadoActivo);