import { describe, expect, it, vi } from "vitest";

import type { SessionUser } from "../../shared/contracts.js";
import { DealerPortalService } from "./dealer-portal.service.js";

describe("DealerPortalService", () => {
  it("aggregates duplicate SKU lines before creating the order", async () => {
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
        countOrdersCreatedOn: vi.fn().mockResolvedValue(4),
        createOrder,
      } as any,
    );

    const user: SessionUser = {
      id: "user-1",
      role: "dealer",
      displayName: "Dealer User",
      email: "dealer@example.com",
      dealerId: "dealer-1",
      dealerCode: "GB-D001",
    };

    const order = await service.createOrder(
      user,
      {
        items: [
          { skuId: "sku-1", qty: 2 },
          { skuId: "sku-1", qty: 3 },
          { skuId: "sku-2", qty: 1 },
        ],
      },
      {},
    );

    expect(createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        orderNumber: "GB-20260331-0005",
        totalQty: 6,
      }),
      expect.anything(),
    );
    expect(order.lineItems).toHaveLength(2);
    expect(order.lineItems[0]?.qty).toBe(5);
  });
});
