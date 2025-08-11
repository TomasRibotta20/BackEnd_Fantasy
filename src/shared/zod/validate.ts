import { Request, Response, NextFunction } from 'express';
import { ZodType } from 'zod';
import { ErrorFactory } from '../errors/errors.factory.js';

export const validate = (schema: ZodType) => (req: Request, _: Response, next: NextFunction) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const error = ErrorFactory.validation("Datos inválidos", result.error.issues.map(issue => ({
      field: issue.path.join('.'),
      message: issue.message
    })));
    return next(error);
  }

  req.body = result.data;
  next();
};