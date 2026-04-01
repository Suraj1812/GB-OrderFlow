import { afterEach, describe, expect, it, vi } from "vitest";

import type { SessionUser } from "../shared/contracts.js";
import { DealerPortalService } from "./services/dealer-portal.service.js";
import { HeadOfficeService } from "./services/head-office.service.js";

function createDecimalLike(value: number) {
  return {
    toString() {
      return value.toFixed(2);
    },
  };
}

describe("Order flow integration", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("creates an order, approves it, and produces a deterministic CSV export", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-31T09:15:00.000Z"));

    const dealer = {
      id: "dealer-1",
      code: "GB-D001",
      name: "Dealer One",
      active: true,
    };

    const skus = [
      {
        id: "sku-1",
        code: "SKU-001",
        name: "PVC Pipe",
        category: "PVC",
        uom: "PCS",
        rate: createDecimalLike(100),
        active: true,
      },
      {
        id: "sku-2",
        code: "SKU-002",
        name: "PVC Bend",
        category: "PVC",
        uom: "PCS",
        rate: createDecimalLike(50),
        active: true,
      },
    ];

    let orderRecord: any = null;
    let exportRecord: any = null;

    const orderRepository = {
      transaction: async (callback: (tx: object) => Promise<unknown>) => callback({}),
      findOrderByIdempotencyKey: vi.fn().mockImplementation(async (_dealerId: string, idempotencyKey: string) => {
        if (orderRecord?.idempotencyKey === idempotencyKey) {
          return orderRecord;
        }

        return null;
      }),
      acquireOrderSequenceLock: vi.fn().mockResolvedValue(undefined),
      countOrdersCreatedOn: vi.fn().mockResolvedValue(0),
      createOrder: vi.fn().mockImplementation(async (input) => {
        orderRecord = {
          id: "order-1",
          orderNumber: input.orderNumber,
          idempotencyKey: input.idempotencyKey,
          dealerId: input.dealerId,
          dealer,
          status: "PENDING",
          totalQty: input.totalQty,
          grossAmount: createDecimalLike(input.grossAmount),
          discountPct: null,
          netAmount: null,
          remarks: null,
          approvedAt: null,
          rejectedAt: null,
          createdAt: new Date("2026-03-31T09:15:00.000Z"),
          updatedAt: new Date("2026-03-31T09:15:00.000Z"),
          exports: [],
          orderItems: input.items.map((item: any, index: number) => {
            const sku = skus.find((entry) => entry.id === item.skuId)!;
            return {
              id: `line-${index + 1}`,
              skuId: item.skuId,
              qty: item.qty,
              rate: createDecimalLike(item.rate),
              lineTotal: createDecimalLike(item.lineTotal),
              sku,
            };
          }),
        };

        return orderRecord;
      }),
      findOrderById: vi.fn().mockImplementation(async () => orderRecord),
      approvePendingOrder: vi.fn().mockImplementation(async (_orderId: string, discountPct: number, netAmount: number) => {
        if (!orderRecord || orderRecord.status !== "PENDING") {
          return null;
        }

        orderRecord = {
          ...orderRecord,
          status: "APPROVED",
          discountPct: createDecimalLike(discountPct),
          netAmount: createDecimalLike(netAmount),
          approvedAt: new Date("2026-03-31T10:15:00.000Z"),
          updatedAt: new Date("2026-03-31T10:15:00.000Z"),
        };
        return orderRecord;
      }),
      rejectPendingOrder: vi.fn(),
      upsertExportRecord: vi.fn().mockImplementation(async (orderId: string) => {
        if (!exportRecord) {
          exportRecord = {
            id: "export-1",
            orderId,
            status: "PENDING",
            attemptCount: 0,
            fileName: null,
            csvSha256: null,
            csvContent: null,
            processingStartedAt: null,
            generatedAt: null,
            downloadedAt: null,
            lastError: null,
            createdAt: new Date("2026-03-31T10:15:00.000Z"),
            updatedAt: new Date("2026-03-31T10:15:00.000Z"),
            order: orderRecord,
          };
        }

        return exportRecord;
      }),
      claimExportForProcessing: vi.fn().mockImplementation(async () => {
        if (!exportRecord) {
          return null;
        }

        if (exportRecord.status === "PENDING" || exportRecord.status === "FAILED") {
          exportRecord = {
            ...exportRecord,
            status: "PROCESSING",
            attemptCount: exportRecord.attemptCount + 1,
            processingStartedAt: new Date("2026-03-31T10:16:00.000Z"),
            order: orderRecord,
          };
        }

        return exportRecord;
      }),
      updateExportRecord: vi.fn().mockImplementation(async (_exportId: string, input: Record<string, unknown>) => {
        exportRecord = {
          ...exportRecord,
          ...input,
          order: orderRecord,
        };
        return exportRecord;
      }),
      findExportByOrderId: vi.fn().mockImplementation(async () => (
        exportRecord
          ? {
              ...exportRecord,
              order: orderRecord,
            }
          : null
      )),
      findExportById: vi.fn().mockImplementation(async () => (
        exportRecord
          ? {
              ...exportRecord,
              order: orderRecord,
            }
          : null
      )),
      markExportDownloaded: vi.fn().mockImplementation(async () => {
        exportRecord = {
          ...exportRecord,
          downloadedAt: new Date("2026-03-31T10:20:00.000Z"),
          order: orderRecord,
        };
        return exportRecord;
      }),
    };

    const authRepository = {
      createAuditLog: vi.fn().mockResolvedValue(undefined),
    };

    const dealerService = new DealerPortalService(
      authRepository as any,
      {} as any,
      {
        findDealerById: vi.fn().mockResolvedValue(dealer),
        listActiveSkusByIds: vi.fn().mockResolvedValue(skus),
      } as any,
      orderRepository as any,
    );

    const headOfficeService = new HeadOfficeService(
      authRepository as any,
      {} as any,
      orderRepository as any,
      {
        enqueue: vi.fn().mockImplementation(async (_key: string, task: () => Promise<unknown>) => task()),
      } as any,
    );

    const dealerUser: SessionUser = {
      id: "dealer-user-1",
      role: "dealer",
      displayName: "Dealer User",
      email: "dealer@example.com",
      dealerId: dealer.id,
      dealerCode: dealer.code,
    };

    const headOfficeUser: SessionUser = {
      id: "ho-user-1",
      role: "head_office",
      displayName: "Head Office",
      email: "admin@example.com",
    };

    const createdOrder = await dealerService.createOrder(
      dealerUser,
      {
        items: [
          { skuId: "sku-1", qty: 2 },
          { skuId: "sku-2", qty: 3 },
        ],
      },
      {
        requestId: "req-create-order",
      },
      "idem-full-flow-123456",
    );

    expect(createdOrder.orderNumber).toBe("GB-20260331-0001");

    await headOfficeService.approveOrder(
      "order-1",
      10,
      headOfficeUser,
      {
        requestId: "req-approve-order",
      },
    );

    const exportResult = await headOfficeService.getOrderExport("order-1");
    expect(exportResult.status).toBe("completed");
    expect(exportResult.downloadUrl).toContain("/api/v1/exports/download");
    expect(exportResult.sha256).toHaveLength(64);

    const downloadable = await headOfficeService.getDownloadableExport(exportResult.exportId);
    expect(downloadable.fileName).toBe("import-sales-bill-GB-20260331-0001.csv");
    expect(downloadable.content.startsWith("\uFEFF")).toBe(true);
    expect(downloadable.content).toContain("ORDER_DATE,SERIES,ITEM_CODE");
    expect(downloadable.sha256).toBe(exportResult.sha256);
  });
});
