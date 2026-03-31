import type { Order } from "../shared/contracts.js";

function formatDate(value: string) {
  const date = new Date(value);
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();

  return `${day}/${month}/${year}`;
}

function formatCurrency(value: number) {
  return value.toFixed(2);
}

function escapeCsvValue(value: string) {
  if (value.includes(",") || value.includes("\"") || value.includes("\n")) {
    return `"${value.replaceAll("\"", "\"\"")}"`;
  }

  return value;
}

export function buildOrderCsv(order: Order) {
  const headers = [
    "PARTY_CODE",
    "ORDER_DATE",
    "SERIES",
    "ITEM_CODE",
    "QTY",
    "RATE",
    "DISC_PCT",
    "NET_AMOUNT",
  ];

  const discountPct = order.discountPct ?? 0;

  const rows = order.lineItems.map((item) => {
    const netAmount = Number(
      (item.lineTotal * (1 - discountPct / 100)).toFixed(2),
    );

    return [
      order.dealerName,
      formatDate(order.createdAt),
      "SO",
      item.skuCode,
      String(item.qty),
      formatCurrency(item.rate),
      discountPct.toFixed(2),
      formatCurrency(netAmount),
    ]
      .map(escapeCsvValue)
      .join(",");
  });

  const csv = [headers.join(","), ...rows].join("\n");

  return {
    filename: `import-sales-bill-${order.orderNumber}.csv`,
    csv,
  };
}

