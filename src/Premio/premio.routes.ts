import { Router } from 'express';
import { findAll, findByTier, findByTipo, findOne, add, update, remove } from './premio.controller.js';
import { validate, validateParams } from '../shared/zod/validate.js';
import { 
  createPremioSchema, 
  updatePremioSchema, 
  idPremioParamsSchema,
  tierParamsSchema,
  tipoParamsSchema
} from './premio.schema.js';
import { requireAdmin } from '../Auth/auth.requires.js';

export const premioRouter = Router();

premioRouter.get('/', requireAdmin, findAll);
premioRouter.get('/tier/:tier', requireAdmin, validateParams(tierParamsSchema), findByTier);
premioRouter.get('/tipo/:tipo', requireAdmin, validateParams(tipoParamsSchema), findByTipo);
premioRouter.get('/:id', requireAdmin, validateParams(idPremioParamsSchema), findOne);

premioRouter.post('/', requireAdmin, validate(createPremioSchema), add);
premioRouter.put('/:id', requireAdmin, validateParams(idPremioParamsSchema), validate(updatePremioSchema), update);
premioRouter.patch('/:id', requireAdmin, validateParams(idPremioParamsSchema), validate(updatePremioSchema), update);
premioRouter.delete('/:id', requireAdmin, validateParams(idPremioParamsSchema), remove);