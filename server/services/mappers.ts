import type {
  Dealer,
  DealerCatalogItem,
  DealerOrder,
  Order,
  SessionUser,
  Sku,
} from "../../shared/contracts.js";

function asNullableString(value: string | null | undefined) {
  return value ?? null;
}

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function toNumber(value: { toString(): string } | number | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  return typeof value === "number" ? value : Number(value.toString());
}

export function mapDealer(record: {
  id: string;
  code: string;
  name: string;
  region: string;
  contactPerson: string;
  phone: string;
  email: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}): Dealer {
  return {
    id: record.id,
    code: record.code,
    name: record.name,
    region: record.region,
    contactPerson: record.contactPerson,
    phone: record.phone,
    email: asNullableString(record.email),
    active: record.active,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export function mapSku(record: {
  id: string;
  code: string;
  name: string;
  category: string;
  uom: string;
  rate: { toString(): string } | number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}): Sku {
  return {
    id: record.id,
    code: record.code,
    name: record.name,
    category: record.category,
    uom: record.uom,
    rate: Number(record.rate.toString()),
    active: record.active,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export function mapCatalogItem(record: {
  id: string;
  code: string;
  name: string;
  category: string;
  uom: string;
}): DealerCatalogItem {
  return {
    id: record.id,
    code: record.code,
    name: record.name,
    category: record.category,
    uom: record.uom,
  };
}

export function mapSessionUser(record: {
  id: string;
  role: "DEALER" | "HEAD_OFFICE";
  displayName: string;
  email: string | null;
  dealerId?: string | null;
  dealer?: { code: string } | null;
}): SessionUser {
  return {
    id: record.id,
    role: record.role === "HEAD_OFFICE" ? "head_office" : "dealer",
    displayName: record.displayName,
    email: asNullableString(record.email),
    dealerId: record.dealerId ?? null,
    dealerCode: record.dealer?.code ?? null,
  };
}

export function mapOrder(record: {
  id: string;
  orderNumber: string;
  dealerId: string;
  dealer: { code: string; name: string };
  createdAt: Date;
  updatedAt: Date;
  status: "PENDING" | "APPROVED" | "REJECTED";
  totalQty: number;
  grossAmount: { toString(): string } | number;
  discountPct: { toString(): string } | number | null;
  netAmount: { toString(): string } | number | null;
  remarks: string | null;
  approvedAt: Date | null;
  rejectedAt: Date | null;
  orderItems: Array<{
    id: string;
    skuId: string;
    qty: number;
    rate: { toString(): string } | number;
    lineTotal: { toString(): string } | number;
    sku: { code: string; name: string; category: string; uom: string };
  }>;
  exports?: Array<{ status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" }> | null;
}): Order {
  const latestExport = record.exports?.[0];

  return {
    id: record.id,
    orderNumber: record.orderNumber,
    dealerId: record.dealerId,
    dealerCode: record.dealer.code,
    dealerName: record.dealer.name,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    status: record.status.toLowerCase() as Order["status"],
    totalQty: record.totalQty,
    grossAmount: toNumber(record.grossAmount) ?? 0,
    discountPct: toNumber(record.discountPct),
    netAmount: toNumber(record.netAmount),
    remarks: record.remarks,
    approvedAt: toIso(record.approvedAt),
    rejectedAt: toIso(record.rejectedAt),
    exportStatus: latestExport
      ? (latestExport.status.toLowerCase() as Order["exportStatus"])
      : null,
    lineItems: record.orderItems.map((item) => ({
      id: item.id,
      skuId: item.skuId,
      skuCode: item.sku.code,
      skuName: item.sku.name,
      category: item.sku.category,
      uom: item.sku.uom,
      qty: item.qty,
      rate: toNumber(item.rate) ?? 0,
      lineTotal: toNumber(item.lineTotal) ?? 0,
    })),
  };
}

export function mapDealerOrder(record: Parameters<typeof mapOrder>[0]): DealerOrder {
  const mapped = mapOrder(record);

  return {
    id: mapped.id,
    orderNumber: mapped.orderNumber,
    dealerCode: mapped.dealerCode,
    dealerName: mapped.dealerName,
    createdAt: mapped.createdAt,
    updatedAt: mapped.updatedAt,
    status: mapped.status,
    totalQty: mapped.totalQty,
    remarks: mapped.remarks,
    approvedAt: mapped.approvedAt,
    rejectedAt: mapped.rejectedAt,
    finalVisibleTotal: mapped.status === "approved" ? mapped.netAmount : null,
    lineItems: mapped.lineItems.map((item) => ({
      id: item.id,
      skuId: item.skuId,
      skuCode: item.skuCode,
      skuName: item.skuName,
      category: item.category,
      uom: item.uom,
      qty: item.qty,
    })),
  };
}
