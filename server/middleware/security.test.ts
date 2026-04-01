import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";

import { sanitizeRequest } from "./security.js";

describe("sanitizeRequest", () => {
  it("sanitizes getter-backed query objects and shadows request.query with sanitized data", () => {
    const rawQuery = {
      search: "  dealer\0  ",
      nested: {
        value: "  sku-1  ",
      },
    };
    const request = {
      body: {
        note: "  urgent\0  ",
      },
      params: {
        orderId: "  order-1  ",
      },
    } as Partial<Request>;

    Object.defineProperty(request, "query", {
      configurable: true,
      enumerable: true,
      get: () => ({
        search: rawQuery.search,
        nested: {
          value: rawQuery.nested.value,
        },
      }),
    });

    const next = vi.fn<NextFunction>();

    sanitizeRequest(request as Request, {} as Response, next);

    expect(request.body).toEqual({
      note: "urgent",
    });
    expect(request.query).toEqual({
      search: "dealer",
      nested: {
        value: "sku-1",
      },
    });
    expect(request.params).toEqual({
      orderId: "order-1",
    });
    expect(next).toHaveBeenCalledOnce();
  });
});
