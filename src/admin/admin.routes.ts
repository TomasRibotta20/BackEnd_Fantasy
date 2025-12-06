import { Router } from 'express'
import { adminController } from './admin.controller.js'
import { requireAdmin } from '../Auth/auth.requires.js'

export const adminRouter = Router()

// Todas las rutas requieren ser admin
adminRouter.use(requireAdmin)

adminRouter.post('/set-jornada-activa', adminController.setJornadaActiva)
adminRouter.post('/habilitar-modificaciones', adminController.habilitarModificaciones)
adminRouter.post('/deshabilitar-modificaciones', adminController.deshabilitarModificaciones)
adminRouter.get('/config', adminController.getConfig)
adminRouter.post('/set-cupo-maximo-torneos', adminController.setCupoMaximoTorneos)

adminRouter.post('/jornadas/:jornadaId/procesar', adminController.procesarJornada)
adminRouter.post('/jornadas/:jornadaId/recalcular', adminController.recalcularPuntajesJornada)