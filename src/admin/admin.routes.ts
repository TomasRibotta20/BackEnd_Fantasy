import { Router } from 'express'
import { adminController } from './admin.controller.js'
import { requireAdmin } from '../Auth/auth.requires.js'
import { validate } from '../shared/zod/validate.js'
import { seedDatabaseSchema } from './admin.schema.js'

export const adminRouter = Router()

// Todas las rutas requieren ser admin
adminRouter.use(requireAdmin)

//Configuración del juego
adminRouter.patch('/config', (req, res, next) => adminController.updateConfig(req, res, next));
adminRouter.get('/config', adminController.getConfig)


//Procesamiento de jornadas
adminRouter.post('/jornadas/:jornadaId/procesar', adminController.procesarJornada)
adminRouter.post('/jornadas/:jornadaId/recalcular', adminController.recalcularPuntajesJornada)

//Seed de base de datos
adminRouter.post('/seed', validate(seedDatabaseSchema), adminController.seedDatabase)
//Automatización
adminRouter.post('/automation/toggle', (req, res, next) => adminController.toggleAutomation(req, res, next))
adminRouter.get('/automation/status', (req, res, next) => adminController.getAutomationStatus(req, res, next))


