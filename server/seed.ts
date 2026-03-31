import bcrypt from "bcryptjs";

import type { Database, DealerRecord, HeadOfficeUser } from "./types.js";
import type { Order, OrderLineItem, Sku } from "../shared/contracts.js";

function buildDealer(
  id: string,
  code: string,
  name: string,
  region: string,
  contactPerson: string,
  phone: string,
  email: string,
  password: string,
  active = true,
): DealerRecord {
  return {
    id,
    code,
    name,
    region,
    contactPerson,
    phone,
    email,
    active,
    passwordHash: bcrypt.hashSync(password, 10),
  };
}

function buildHeadOfficeUser(
  id: string,
  username: string,
  name: string,
  password: string,
): HeadOfficeUser {
  return {
    id,
    username,
    name,
    passwordHash: bcrypt.hashSync(password, 10),
  };
}

function findSku(skus: Sku[], skuId: string): Sku {
  const match = skus.find((sku) => sku.id === skuId);
  if (!match) {
    throw new Error(`Missing seeded SKU: ${skuId}`);
  }
  return match;
}

function buildLineItem(skus: Sku[], skuId: string, qty: number): OrderLineItem {
  const sku = findSku(skus, skuId);
  const lineTotal = Number((sku.rate * qty).toFixed(2));

  return {
    id: `${skuId}-${qty}`,
    skuId: sku.id,
    skuCode: sku.code,
    skuName: sku.name,
    category: sku.category,
    uom: sku.uom,
    qty,
    rate: sku.rate,
    lineTotal,
  };
}

function buildOrder({
  id,
  orderNumber,
  dealer,
  createdAt,
  status,
  items,
  discountPct = null,
  remarks = null,
  approvedAt = null,
  rejectedAt = null,
}: {
  id: string;
  orderNumber: string;
  dealer: DealerRecord;
  createdAt: string;
  status: Order["status"];
  items: OrderLineItem[];
  discountPct?: number | null;
  remarks?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
}): Order {
  const totalQty = items.reduce((total, item) => total + item.qty, 0);
  const grossAmount = Number(
    items.reduce((total, item) => total + item.lineTotal, 0).toFixed(2),
  );
  const netAmount =
    discountPct === null
      ? null
      : Number((grossAmount * (1 - discountPct / 100)).toFixed(2));

  return {
    id,
    orderNumber,
    dealerId: dealer.id,
    dealerCode: dealer.code,
    dealerName: dealer.name,
    createdAt,
    status,
    totalQty,
    grossAmount,
    discountPct,
    netAmount,
    remarks,
    approvedAt,
    rejectedAt,
    lineItems: items,
  };
}

export function createSeedDatabase(): Database {
  const headOfficeUsers = [
    buildHeadOfficeUser(
      "ho-1",
      "admin",
      "Dhruv Agarwal",
      "GB@2026!",
    ),
  ];

  const dealers = [
    buildDealer(
      "dealer-1",
      "GB-D001",
      "Dey Pipe Centre",
      "Kolkata North",
      "Subhojit Dey",
      "+91 98310 22001",
      "dey.pipe@example.com",
      "dealer123",
    ),
    buildDealer(
      "dealer-2",
      "GB-D014",
      "Shivam Hardware House",
      "Howrah",
      "Rohit Jalan",
      "+91 98310 22014",
      "shivam.hw@example.com",
      "dealer123",
    ),
    buildDealer(
      "dealer-3",
      "GB-D032",
      "Eastern PVC Point",
      "Siliguri",
      "Rajib Sharma",
      "+91 98310 22032",
      "eastern.pvc@example.com",
      "dealer123",
    ),
    buildDealer(
      "dealer-4",
      "GB-D041",
      "Maa Tara Sanitary Stores",
      "Bardhaman",
      "Arindam Roy",
      "+91 98310 22041",
      "maatara@example.com",
      "dealer123",
      false,
    ),
  ];

  const dealerOne = dealers[0]!;
  const dealerTwo = dealers[1]!;
  const dealerThree = dealers[2]!;

  const skus: Sku[] = [
    {
      id: "sku-1",
      code: "A004",
      name: "Supreme PVC Pipe 40mm, 6m",
      category: "Pipes",
      uom: "PCS",
      rate: 631.8,
      active: true,
    },
    {
      id: "sku-2",
      code: "A018",
      name: "Supreme PVC Pipe 50mm, 6m",
      category: "Pipes",
      uom: "PCS",
      rate: 884.25,
      active: true,
    },
    {
      id: "sku-3",
      code: "A032",
      name: "Supreme PVC Pipe 75mm, 6m",
      category: "Pipes",
      uom: "PCS",
      rate: 1420.5,
      active: true,
    },
    {
      id: "sku-4",
      code: "B011",
      name: "Elbow 40mm",
      category: "Fittings",
      uom: "PCS",
      rate: 48.75,
      active: true,
    },
    {
      id: "sku-5",
      code: "B014",
      name: "Elbow 50mm",
      category: "Fittings",
      uom: "PCS",
      rate: 72.1,
      active: true,
    },
    {
      id: "sku-6",
      code: "B063",
      name: "Tee 75mm",
      category: "Fittings",
      uom: "PCS",
      rate: 118.35,
      active: true,
    },
    {
      id: "sku-7",
      code: "C020",
      name: "Solvent Cement 500ml",
      category: "Chemicals",
      uom: "TIN",
      rate: 187.9,
      active: true,
    },
    {
      id: "sku-8",
      code: "C028",
      name: "PVC Primer 250ml",
      category: "Chemicals",
      uom: "TIN",
      rate: 119.45,
      active: true,
    },
    {
      id: "sku-9",
      code: "D102",
      name: "Ball Valve 1 inch",
      category: "Valves",
      uom: "PCS",
      rate: 246.6,
      active: true,
    },
    {
      id: "sku-10",
      code: "D118",
      name: "Ball Valve 1.5 inch",
      category: "Valves",
      uom: "PCS",
      rate: 382.8,
      active: true,
    },
    {
      id: "sku-11",
      code: "E008",
      name: "Pipe Clamp 40mm",
      category: "Accessories",
      uom: "PCS",
      rate: 12.55,
      active: true,
    },
    {
      id: "sku-12",
      code: "E021",
      name: "Pipe Clamp 75mm",
      category: "Accessories",
      uom: "PCS",
      rate: 24.9,
      active: true,
    },
    {
      id: "sku-13",
      code: "F015",
      name: "Thread Seal Tape",
      category: "Consumables",
      uom: "PCS",
      rate: 16.4,
      active: true,
    },
    {
      id: "sku-14",
      code: "F022",
      name: "Reducer 75x50mm",
      category: "Fittings",
      uom: "PCS",
      rate: 96.3,
      active: true,
    },
    {
      id: "sku-15",
      code: "G009",
      name: "Union 50mm",
      category: "Fittings",
      uom: "PCS",
      rate: 133.55,
      active: true,
    },
    {
      id: "sku-16",
      code: "H004",
      name: "SWR Pipe 110mm, 3m",
      category: "SWR",
      uom: "PCS",
      rate: 764.2,
      active: true,
    },
    {
      id: "sku-17",
      code: "H015",
      name: "SWR Door Tee 110mm",
      category: "SWR",
      uom: "PCS",
      rate: 182.65,
      active: true,
    },
    {
      id: "sku-18",
      code: "J020",
      name: "CPVC Pipe 25mm, 3m",
      category: "CPVC",
      uom: "PCS",
      rate: 212.4,
      active: true,
    },
  ];

  const orders: Order[] = [
    buildOrder({
      id: "order-1",
      orderNumber: "GB-20260331-0001",
      dealer: dealerOne,
      createdAt: "2026-03-31T08:15:00.000Z",
      status: "pending",
      items: [
        buildLineItem(skus, "sku-1", 70),
        buildLineItem(skus, "sku-4", 140),
        buildLineItem(skus, "sku-7", 12),
      ],
    }),
    buildOrder({
      id: "order-2",
      orderNumber: "GB-20260331-0002",
      dealer: dealerTwo,
      createdAt: "2026-03-31T09:05:00.000Z",
      status: "pending",
      items: [
        buildLineItem(skus, "sku-2", 48),
        buildLineItem(skus, "sku-5", 96),
        buildLineItem(skus, "sku-9", 24),
      ],
    }),
    buildOrder({
      id: "order-3",
      orderNumber: "GB-20260331-0003",
      dealer: dealerThree,
      createdAt: "2026-03-31T09:42:00.000Z",
      status: "pending",
      items: [
        buildLineItem(skus, "sku-16", 36),
        buildLineItem(skus, "sku-17", 22),
        buildLineItem(skus, "sku-13", 60),
      ],
    }),
    buildOrder({
      id: "order-4",
      orderNumber: "GB-20260331-0004",
      dealer: dealerOne,
      createdAt: "2026-03-31T06:05:00.000Z",
      status: "approved",
      discountPct: 8.5,
      approvedAt: "2026-03-31T06:45:00.000Z",
      items: [
        buildLineItem(skus, "sku-3", 12),
        buildLineItem(skus, "sku-6", 24),
        buildLineItem(skus, "sku-15", 24),
      ],
    }),
    buildOrder({
      id: "order-5",
      orderNumber: "GB-20260330-0012",
      dealer: dealerTwo,
      createdAt: "2026-03-30T11:20:00.000Z",
      status: "rejected",
      remarks: "Re-check mixed quantity on valve line before resubmission.",
      rejectedAt: "2026-03-30T12:10:00.000Z",
      items: [
        buildLineItem(skus, "sku-10", 18),
        buildLineItem(skus, "sku-12", 40),
      ],
    }),
  ];

  return {
    headOfficeUsers,
    dealers,
    skus,
    orders,
  };
}
