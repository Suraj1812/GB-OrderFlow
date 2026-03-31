import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny } from "zod";

export function validateRequest(schemas: {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}) {
  return (request: Request, response: Response, next: NextFunction) => {
    for (const [source, schema] of Object.entries(schemas) as Array<
      [keyof typeof schemas, ZodTypeAny | undefined]
    >) {
      if (!schema) {
        continue;
      }

      const parsed = schema.safeParse(request[source]);

      if (!parsed.success) {
        response.status(400).json({
          code: "VALIDATION_ERROR",
          message: parsed.error.issues[0]?.message ?? "Invalid request payload.",
          details: parsed.error.flatten(),
        });
        return;
      }

      request[source] = parsed.data;
    }

    next();
  };
}
