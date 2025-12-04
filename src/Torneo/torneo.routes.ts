import { Router } from 'express';
import { requireAuth, requireAdmin } from '../Auth/auth.requires.js';
import { findAll, findOne, add, update, remove, validateAccessCode, getMisTorneos, getTorneoUsuario, joinTorneo, leave, iniciarTorneo, expulsar } from './torneo.controller.js';
import { validate, validateQuery, validateParams } from '../shared/zod/validate.js';
import { createTorneoSchema, updateTorneoSchema, idTorneoParamsSchema, torneoQuerySchema, misTorneosQuerySchema, validateAccessCodeSchema, joinTorneoSchema, idTorneoUsuarioExpulsarSchema } from './torneo.schema.js';

const torneoRouter = Router();

torneoRouter.get('/', requireAdmin, validateQuery(torneoQuerySchema), findAll);//Filtro de torneos para admin
torneoRouter.get('/:id', requireAdmin, validateParams(idTorneoParamsSchema) ,findOne);//FindOne para admin
torneoRouter.post('/', requireAuth, validate(createTorneoSchema), add);//Crear torneo solo para usuarios autenticados (user / admin)
torneoRouter.patch('/:id', requireAuth, validateParams(idTorneoParamsSchema), validate(updateTorneoSchema), update);
torneoRouter.put('/:id', requireAuth, validateParams(idTorneoParamsSchema), validate(updateTorneoSchema), update);
torneoRouter.delete('/:id', requireAdmin, validateParams(idTorneoParamsSchema), remove);

torneoRouter.post('/validar-codigo', requireAuth, validate(validateAccessCodeSchema), validateAccessCode);
torneoRouter.post('/unirse', requireAuth, validate(joinTorneoSchema), joinTorneo);
torneoRouter.post('/mis-torneos', requireAuth, validateQuery(misTorneosQuerySchema), getMisTorneos);
torneoRouter.delete('/abandonar/:id', requireAuth, validateParams(idTorneoParamsSchema), leave);
torneoRouter.get('/mi-torneo/:id', requireAuth, validateParams(idTorneoParamsSchema), getTorneoUsuario);  
torneoRouter.delete('/:id/participante/:userId', requireAuth, validateParams(idTorneoUsuarioExpulsarSchema), expulsar);
//hay que enviar el id del ususario y del torneo a la funcion expulsar
torneoRouter.post('/expulsar/:id', requireAuth, validateParams(idTorneoParamsSchema), expulsar);
export { torneoRouter };