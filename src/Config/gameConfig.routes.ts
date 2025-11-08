import { Router } from 'express'
import { gameConfigController } from './gameConfig.controller.js'
import { requireAuth } from '../Auth/auth.requires.js'
export const gameConfigRoutes = Router()

// Rutas para usuarios necesitan estar logeados
gameConfigRoutes.get('/jornada-activa', requireAuth, gameConfigController.getJornadaActiva)
gameConfigRoutes.get('/estado-modificaciones', requireAuth, gameConfigController.getEstadoModificaciones)