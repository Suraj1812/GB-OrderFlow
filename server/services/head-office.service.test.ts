import { describe, expect, it, vi } from "vitest";

import type { SessionUser } from "../../shared/contracts.js";
import { HeadOfficeService } from "./head-office.service.js";

function buildActor(): SessionUser {
  return {
    id: "ho-1",
    role: "head_office",
    displayName: "Head Office",
    email: "ho@example.com",
  };
}

function buildOrder(status: "PENDING" | "APPROVED" | "REJECTED") {
  return {
    id: "order-1",
    orderNumber: "GB-20260331-0001",
    dealerId: "dealer-1",
    dealer: {
      id: "dealer-1",
      code: "GB-D001",
      name: "Dealer One",
    },
    status,
    totalQty: 4,
    grossAmount: {
      toString: () => "1000.00",
    },
    discountPct: status === "APPROVED" ? { toString: () => "10.00" } : null,
    netAmount: status === "APPROVED" ? { toString: () => "900.00" } : null,
    remarks: null,
    approvedAt: status === "APPROVED" ? new Date("2026-03-31T10:00:00.000Z") : null,
    rejectedAt: null,
    createdAt: new Date("2026-03-31T09:00:00.000Z"),
    updatedAt: new Date("2026-03-31T10:00:00.000Z"),
    exports: [],
    orderItems: [
      {
        id: "line-1",
        skuId: "sku-1",
        qty: 4,
        rate: { toString: () => "250.00" },
        lineTotal: { toString: () => "1000.00" },
        sku: {
          code: "SKU-001",
          name: "Pipe",
          category: "PVC",
          uom: "PCS",
        },
      },
    ],
  };
}

describe("HeadOfficeService", () => {
  it("returns the existing export when another approver wins the race", async () => {
    const findOrderById = vi
      .fn()
      .mockResolvedValueOnce(buildOrder("PENDING"))
      .mockResolvedValueOnce(buildOrder("APPROVED"));

    const orderRepository = {
      transaction: vi.fn().mockImplementation(async (callback) => callback({})),
      findOrderById,
      approvePendingOrder: vi.fn().mockResolvedValue(null),
      upsertExportRecord: vi.fn().mockResolvedValue({
        id: "export-1",
        orderId: "order-1",
        status: "PENDING",
      }),
      findExportByOrderId: vi.fn().mockResolvedValue({
        id: "export-1",
        orderId: "order-1",
        status: "COMPLETED",
        fileName: "import-sales-bill-GB-20260331-0001.csv",
        csvSha256: "a".repeat(64),
        generatedAt: new Date("2026-03-31T10:01:00.000Z"),
      }),
    };

    const service = new HeadOfficeService(
      {
        createAuditLog: vi.fn().mockResolvedValue(undefined),
      } as any,
      {} as any,
      orderRepository as any,
      {
        enqueue: vi.fn().mockResolvedValue(undefined),
      } as any,
    );

    const result = await service.approveOrder(
      "order-1",
      10,
      buildActor(),
      { requestId: "req-approve-race" },
    );

    expect(orderRepository.approvePendingOrder).toHaveBeenCalledWith(
      "order-1",
      10,
      900,
      expect.anything(),
    );
    expect(result.status).toBe("completed");
    expect(result.sha256).toBe("a".repeat(64));
  });
});
