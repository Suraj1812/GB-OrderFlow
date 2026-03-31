import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny } from "zod";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function syncRecord(target: Record<string, unknown>, nextValue: Record<string, unknown>) {
  for (const key of Object.keys(target)) {
    delete target[key];
  }

  Object.assign(target, nextValue);
}

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

      if ((source === "query" || source === "params") && isRecord(request[source]) && isRecord(parsed.data)) {
        syncRecord(request[source], parsed.data);
        continue;
      }

      request[source] = parsed.data as never;
    }

    next();
  };
}
