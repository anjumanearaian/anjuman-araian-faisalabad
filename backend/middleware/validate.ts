import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

// Generic validation middleware — wrap any Zod schema
export const validate =
  (schema: ZodSchema) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = (result.error as ZodError).flatten().fieldErrors;
      res.status(400).json({
        error: "Validation failed",
        details: errors,
      });
      return;
    }
    req.body = result.data; // Replace with sanitized/coerced data
    next();
  };
