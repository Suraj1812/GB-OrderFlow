import { describe, expect, it } from "vitest";

import type { Order } from "../../shared/contracts.js";
import { buildDeterministicCsv } from "./csv.js";

const orderFixture: Order = {
  id: "order-1",
  orderNumber: "GB-20260331-0001",
  dealerId: "dealer-1",
  dealerCode: "GB-D001",
  dealerName: "Goel Brothers Dealer",
  createdAt: "2026-03-31T09:15:00.000Z",
  updatedAt: "2026-03-31T09:15:00.000Z",
  status: "approved",
  totalQty: 6,
  grossAmount: 510,
  discountPct: 10,
  netAmount: 459,
  remarks: null,
  approvedAt: "2026-03-31T10:15:00.000Z",
  rejectedAt: null,
  exportStatus: "completed",
  lineItems: [
    {
      id: "line-2",
      skuId: "sku-2",
      skuCode: "SKU-B",
      skuName: "Pipe B",
      category: "PVC",
      uom: "PCS",
      qty: 2,
      rate: 120,
      lineTotal: 240,
    },
    {
      id: "line-1",
      skuId: "sku-1",
      skuCode: "SKU-A",
      skuName: "Pipe A",
      category: "PVC",
      uom: "PCS",
      qty: 3,
      rate: 90,
      lineTotal: 270,
    },
  ],
};

describe("buildDeterministicCsv", () => {
  it("creates a deterministic ERP-safe CSV with BOM and sorted rows", () => {
    const first = buildDeterministicCsv(orderFixture);
    const second = buildDeterministicCsv(orderFixture);

    expect(first).toEqual(second);
    expect(first.fileName).toBe("import-sales-bill-GB-20260331-0001.csv");
    expect(first.content.startsWith("\uFEFF")).toBe(true);

    const lines = first.content.trimEnd().split("\r\n");
    expect(lines[1]).toContain("SKU-A");
    expect(lines[2]).toContain("SKU-B");
    expect(first.sha256).toHaveLength(64);
  });
});
