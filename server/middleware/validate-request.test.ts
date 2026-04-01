import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { describe, expect, it, vi } from "vitest";

import { validateRequest } from "./validate-request.js";

describe("validateRequest", () => {
  it("hydrates getter-backed query objects and shadows request.query with parsed data", () => {
    const rawQuery = {
      page: "2",
      pageSize: "4",
      search: "",
      status: "pending",
    };
    const request = {} as Partial<Request>;

    Object.defineProperty(request, "query", {
      configurable: true,
      enumerable: true,
      get: () => ({
        page: rawQuery.page,
        pageSize: rawQuery.pageSize,
        search: rawQuery.search,
        status: rawQuery.status,
      }),
    });

    const response = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;
    const next = vi.fn<NextFunction>();

    validateRequest({
      query: z.object({
        page: z.coerce.number().int().positive(),
        pageSize: z.coerce.number().int().positive(),
        search: z.string(),
        status: z.enum(["pending", "approved"]),
      }),
    })(request as Request, response, next);

    expect(request.query).toEqual({
      page: 2,
      pageSize: 4,
      search: "",
      status: "pending",
    });
    expect(next).toHaveBeenCalledOnce();
    expect(response.status).not.toHaveBeenCalled();
  });
});
