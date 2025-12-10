import { Router } from 'express'
import { adminController } from './admin.controller.js'
import { requireAdmin } from '../Auth/auth.requires.js'

export const adminRouter = Router()

// Todas las rutas requieren ser admin
adminRouter.use(requireAdmin)

//Configuración del juego
adminRouter.patch('/config', (req, res, next) => adminController.updateConfig(req, res, next));
adminRouter.get('/config', adminController.getConfig)


//Procesamiento de jornadas
adminRouter.post('/jornadas/:jornadaId/procesar', adminController.procesarJornada)
adminRouter.post('/jornadas/:jornadaId/recalcular', adminController.recalcularPuntajesJornada)


