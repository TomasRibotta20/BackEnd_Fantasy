import { Router } from 'express';
import { requireAuth } from '../Auth/auth.requires.js';
import { ofertar,cancelarOferta,obtenerMisOfertas } from './mercadoPuja.controller.js';


export const mercadoPujaRouter = Router();

// Crear/actualizar oferta
mercadoPujaRouter.post('/equipo/:equipoId/ofertar', requireAuth, ofertar);

// Cancelar oferta
mercadoPujaRouter.delete('/puja/:pujaId/cancelar', requireAuth, cancelarOferta);

// Ver mis ofertas
mercadoPujaRouter.get('/equipo/:equipoId/mis-ofertas', requireAuth, obtenerMisOfertas);