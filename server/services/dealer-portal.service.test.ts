import { afterEach, describe, expect, it, vi } from "vitest";

import type { SessionUser } from "../../shared/contracts.js";
import { DealerPortalService } from "./dealer-portal.service.js";

function buildOrderFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: "order-1",
    orderNumber: "GB-20260331-0005",
    dealerId: "dealer-1",
    dealer: {
      id: "dealer-1",
      code: "GB-D001",
      name: "Dealer One",
    },
    status: "PENDING",
    totalQty: 6,
    grossAmount: 550,
    discountPct: null,
    netAmount: null,
    remarks: null,
    approvedAt: null,
    rejectedAt: null,
    createdAt: new Date("2026-03-31T09:15:00.000Z"),
    updatedAt: new Date("2026-03-31T09:15:00.000Z"),
    exports: [],
    orderItems: [
      {
        id: "line-1",
        skuId: "sku-1",
        qty: 5,
        rate: 100,
        lineTotal: 500,
        sku: {
          code: "SKU-001",
          name: "PVC Pipe",
          category: "PVC",
          uom: "PCS",
        },
      },
    ],
    ...overrides,
  };
}

function buildDealerUser(): SessionUser {
  return {
    id: "user-1",
    role: "dealer",
    displayName: "Dealer User",
    email: "dealer@example.com",
    dealerId: "dealer-1",
    dealerCode: "GB-D001",
  };
}

describe("DealerPortalService", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("aggregates duplicate SKU lines before creating the order", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-31T09:15:00.000Z"));

    const createOrder = vi.fn().mockImplementation(async (input) => ({
      id: "order-1",
      orderNumber: input.orderNumber,
      dealerId: input.dealerId,
      dealer: {
        id: "dealer-1",
        code: "GB-D001",
        name: "Dealer One",
      },
      status: "PENDING",
      totalQty: input.totalQty,
      grossAmount: input.grossAmount,
      discountPct: null,
      netAmount: null,
      remarks: null,
      approvedAt: null,
      rejectedAt: null,
      createdAt: new Date("2026-03-31T09:15:00.000Z"),
      updatedAt: new Date("2026-03-31T09:15:00.000Z"),
      exports: [],
      orderItems: input.items.map((item, index) => ({
        id: `line-${index + 1}`,
        skuId: item.skuId,
        qty: item.qty,
        rate: item.rate,
        lineTotal: item.lineTotal,
        sku: {
          code: item.skuId === "sku-1" ? "SKU-001" : "SKU-002",
          name: item.skuId === "sku-1" ? "PVC Pipe" : "PVC Bend",
          category: "PVC",
          uom: "PCS",
        },
      })),
    }));

    const service = new DealerPortalService(
      {
        createAuditLog: vi.fn().mockResolvedValue(undefined),
      } as any,
      {} as any,
      {
        findDealerById: vi.fn().mockResolvedValue({
          id: "dealer-1",
          active: true,
        }),
        listActiveSkusByIds: vi.fn().mockResolvedValue([
          {
            id: "sku-1",
            rate: { toString: () => "100.00" },
          },
          {
            id: "sku-2",
            rate: { toString: () => "50.00" },
          },
        ]),
      } as any,
      {
        transaction: vi.fn().mockImplementation(async (callback) => callback({})),
        findOrderByIdempotencyKey: vi.fn().mockResolvedValue(null),
        acquireOrderSequenceLock: vi.fn().mockResolvedValue(undefined),
        countOrdersCreatedOn: vi.fn().mockResolvedValue(4),
        createOrder,
      } as any,
    );

    const order = await service.createOrder(
      buildDealerUser(),
      {
        items: [
          { skuId: "sku-1", qty: 2 },
          { skuId: "sku-1", qty: 3 },
          { skuId: "sku-2", qty: 1 },
        ],
      },
      { requestId: "req-1" },
      "idem-order-1-key-1234",
    );

    expect(createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        orderNumber: "GB-20260331-0005",
        idempotencyKey: "idem-order-1-key-1234",
        totalQty: 6,
      }),
      expect.anything(),
    );
    expect(order.lineItems).toHaveLength(2);
    expect(order.lineItems[0]?.qty).toBe(5);
  });

  it("returns the original order for a repeated idempotency key", async () => {
    const existingOrder = buildOrderFixture();
    const createOrder = vi.fn();
    const findOrderByIdempotencyKey = vi.fn().mockResolvedValue(existingOrder);

    const service = new DealerPortalService(
      {
        createAuditLog: vi.fn().mockResolvedValue(undefined),
      } as any,
      {} as any,
      {
        findDealerById: vi.fn().mockResolvedValue({
          id: "dealer-1",
          active: true,
        }),
      } as any,
      {
        findOrderByIdempotencyKey,
        transaction: vi.fn(),
        createOrder,
      } as any,
    );

    const result = await service.createOrder(
      buildDealerUser(),
      {
        items: [{ skuId: "sku-1", qty: 2 }],
      },
      { requestId: "req-2" },
      "idem-repeat-123456",
    );

    expect(findOrderByIdempotencyKey).toHaveBeenCalledWith("dealer-1", "idem-repeat-123456");
    expect(createOrder).not.toHaveBeenCalled();
    expect(result.orderNumber).toBe(existingOrder.orderNumber);
  });

  it("rejects an empty cart before touching persistence", async () => {
    const findDealerById = vi.fn();
    const service = new DealerPortalService(
      {} as any,
      {} as any,
      {
        findDealerById,
      } as any,
      {} as any,
    );

    await expect(
      service.createOrder(
        buildDealerUser(),
        {
          items: [],
        },
        { requestId: "req-3" },
        "idem-empty-123456",
      ),
    ).rejects.toThrow();

    expect(findDealerById).not.toHaveBeenCalled();
  });

  it("rejects quantities above the allowed limit", async () => {
    const service = new DealerPortalService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );

    await expect(
      service.createOrder(
        buildDealerUser(),
        {
          items: [{ skuId: "sku-1", qty: 12_000 }],
        },
        { requestId: "req-4" },
        "idem-large-123456",
      ),
    ).rejects.toThrow();
  });
});
