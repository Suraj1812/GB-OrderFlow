import crypto from "node:crypto";

import { z } from "zod";

import { orderSchema, type Order } from "../../shared/contracts.js";

const exportRowSchema = z.object({
  PARTY_CODE: z.string().min(1),
  ORDER_DATE: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/),
  SERIES: z.literal("SO"),
  ITEM_CODE: z.string().min(1),
  QTY: z.string().regex(/^\d+$/),
  RATE: z.string().regex(/^\d+\.\d{2}$/),
  DISC_PCT: z.string().regex(/^\d+\.\d{2}$/),
  NET_AMOUNT: z.string().regex(/^\d+\.\d{2}$/),
});

function formatDate(value: string) {
  const date = new Date(value);
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = String(date.getUTCFullYear());
  return `${day}/${month}/${year}`;
}

function formatMoney(value: number) {
  return value.toFixed(2);
}

function toCents(value: number) {
  return Math.round(value * 100);
}

function formatMoneyFromCents(value: number) {
  return formatMoney(value / 100);
}

function escapeCsvValue(value: string) {
  if (/[,"\n\r]/.test(value)) {
    return `"${value.replaceAll("\"", "\"\"")}"`;
  }

  return value;
}

export function buildDeterministicCsv(order: Order) {
  const parsedOrder = orderSchema.parse(order);

  if (parsedOrder.status !== "approved") {
    throw new Error("Only approved orders can be exported.");
  }

  const discountPct = parsedOrder.discountPct ?? 0;
  const discountBasisPoints = Math.round(discountPct * 100);
  const sortedItems = [...parsedOrder.lineItems].sort((left, right) =>
    left.skuCode.localeCompare(right.skuCode),
  );

  const rows = sortedItems.map((item) =>
    exportRowSchema.parse({
      PARTY_CODE: parsedOrder.dealerName,
      ORDER_DATE: formatDate(parsedOrder.createdAt),
      SERIES: "SO",
      ITEM_CODE: item.skuCode,
      QTY: String(item.qty),
      RATE: formatMoney(item.rate),
      DISC_PCT: formatMoney(discountPct),
      NET_AMOUNT: formatMoneyFromCents(
        Math.round((toCents(item.lineTotal) * (10_000 - discountBasisPoints)) / 10_000),
      ),
    }),
  );

  const headers = Object.keys(exportRowSchema.shape);
  const csvBody = [headers, ...rows.map((row) => headers.map((key) => row[key as keyof typeof row]))]
    .map((columns) => columns.map((value) => escapeCsvValue(String(value))).join(","))
    .join("\r\n");

  const csvWithBom = `\uFEFF${csvBody}\r\n`;
  const hash = crypto.createHash("sha256").update(csvWithBom).digest("hex");

  return {
    fileName: `import-sales-bill-${parsedOrder.orderNumber}.csv`,
    content: csvWithBom,
    sha256: hash,
  };
}
