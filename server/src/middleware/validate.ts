import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodEffects } from 'zod';

type Schema = AnyZodObject | ZodEffects<AnyZodObject>;

/** Validates req.body against a zod schema; replaces body with parsed data. */
export const validateBody =
  (schema: Schema) =>
  (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) return next(result.error);
    req.body = result.data;
    next();
  };

export const validateQuery =
  (schema: Schema) =>
  (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) return next(result.error);
    // Express 4 query is read-only in TS; attach parsed copy.
    (req as Request & { validatedQuery: unknown }).validatedQuery = result.data;
    next();
  };
