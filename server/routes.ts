import bcrypt from "bcryptjs";
import { Router } from "express";

import {
  approveOrderSchema,
  authSessionSchema,
  createOrderSchema,
  dealerCatalogResponseSchema,
  dealerCatalogItemSchema,
  dealerLoginSchema,
  dealerOrderViewSchema,
  dashboardSummarySchema,
  dealerSchema,
  headOfficeLoginSchema,
  orderSchema,
  rejectOrderSchema,
  skuSchema,
  upsertDealerSchema,
  upsertSkuSchema,
  type AuthSession,
  type Dealer,
  type DealerOrderView,
  type Order,
  type Sku,
} from "../shared/contracts.js";
import { authenticate, createSessionToken, requireRole } from "./auth.js";
import { buildOrderCsv } from "./csv.js";
import { readDatabase, updateDatabase } from "./store.js";
import type { AuthenticatedRequest, Database, DealerRecord, SessionUser } from "./types.js";

function sanitizeDealer(dealer: DealerRecord): Dealer {
  const { passwordHash: _passwordHash, ...safeDealer } = dealer;
  return dealerSchema.parse(safeDealer);
}

function buildSession(user: SessionUser): AuthSession {
  const token = createSessionToken(user);
  return authSessionSchema.parse({ ...user, token });
}

function toDealerOrderView(order: Order): DealerOrderView {
  return dealerOrderViewSchema.parse({
    id: order.id,
    orderNumber: order.orderNumber,
    dealerCode: order.dealerCode,
    dealerName: order.dealerName,
    createdAt: order.createdAt,
    status: order.status,
    totalQty: order.totalQty,
    remarks: order.remarks,
    approvedAt: order.approvedAt,
    rejectedAt: order.rejectedAt,
    lineItems: order.lineItems.map((item) => ({
      id: item.id,
      skuId: item.skuId,
      skuCode: item.skuCode,
      skuName: item.skuName,
      category: item.category,
      uom: item.uom,
      qty: item.qty,
    })),
    finalVisibleTotal: order.status === "approved" ? order.netAmount : null,
  });
}

function isToday(timestamp: string | null) {
  if (!timestamp) {
    return false;
  }

  const now = new Date();
  const date = new Date(timestamp);

  return (
    now.getUTCFullYear() === date.getUTCFullYear() &&
    now.getUTCMonth() === date.getUTCMonth() &&
    now.getUTCDate() === date.getUTCDate()
  );
}

function generateOrderNumber(database: Database) {
  const today = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const todaysOrders = database.orders.filter((order) =>
    order.orderNumber.includes(today),
  ).length;

  return `GB-${today}-${String(todaysOrders + 1).padStart(4, "0")}`;
}

function createOrderFromInput(
  database: Database,
  dealer: DealerRecord,
  items: Array<{ skuId: string; qty: number }>,
) {
  const aggregated = new Map<string, number>();

  for (const item of items) {
    aggregated.set(item.skuId, (aggregated.get(item.skuId) ?? 0) + item.qty);
  }

  const lineItems = Array.from(aggregated.entries()).map(([skuId, qty]) => {
    const sku = database.skus.find((candidate) => candidate.id === skuId && candidate.active);
    if (!sku) {
      throw new Error("One or more SKUs are inactive or unavailable.");
    }

    return {
      id: `${sku.id}-${qty}-${crypto.randomUUID()}`,
      skuId: sku.id,
      skuCode: sku.code,
      skuName: sku.name,
      category: sku.category,
      uom: sku.uom,
      qty,
      rate: sku.rate,
      lineTotal: Number((sku.rate * qty).toFixed(2)),
    };
  });

  const totalQty = lineItems.reduce((total, item) => total + item.qty, 0);
  const grossAmount = Number(
    lineItems.reduce((total, item) => total + item.lineTotal, 0).toFixed(2),
  );

  const order: Order = orderSchema.parse({
    id: crypto.randomUUID(),
    orderNumber: generateOrderNumber(database),
    dealerId: dealer.id,
    dealerCode: dealer.code,
    dealerName: dealer.name,
    createdAt: new Date().toISOString(),
    status: "pending",
    totalQty,
    grossAmount,
    discountPct: null,
    netAmount: null,
    remarks: null,
    approvedAt: null,
    rejectedAt: null,
    lineItems,
  });

  database.orders.unshift(order);
  return order;
}

export function createRouter() {
  const router = Router();

  router.get("/health", (_request, response) => {
    response.json({ ok: true });
  });

  router.post("/auth/login/dealer", (request, response) => {
    const parsed = dealerLoginSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid dealer login." });
      return;
    }

    const database = readDatabase();
    const dealer = database.dealers.find(
      (candidate) =>
        candidate.code.toLowerCase() === parsed.data.dealerCode.toLowerCase(),
    );

    if (!dealer || !dealer.active || !bcrypt.compareSync(parsed.data.password, dealer.passwordHash)) {
      response.status(401).json({ message: "Invalid dealer code or password." });
      return;
    }

    response.json(
      buildSession({
        id: dealer.id,
        role: "dealer",
        displayName: dealer.name,
        dealerCode: dealer.code,
      }),
    );
  });

  router.post("/auth/login/head-office", (request, response) => {
    const parsed = headOfficeLoginSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid login." });
      return;
    }

    const database = readDatabase();
    const user = database.headOfficeUsers.find(
      (candidate) =>
        candidate.username.toLowerCase() === parsed.data.username.toLowerCase(),
    );

    if (!user || !bcrypt.compareSync(parsed.data.password, user.passwordHash)) {
      response.status(401).json({ message: "Invalid username or password." });
      return;
    }

    response.json(
      buildSession({
        id: user.id,
        role: "head_office",
        displayName: user.name,
      }),
    );
  });

  router.get("/auth/me", authenticate, (request: AuthenticatedRequest, response) => {
    response.json(request.user);
  });

  router.get(
    "/dealer/catalog",
    authenticate,
    requireRole("dealer"),
    (_request, response) => {
      const database = readDatabase();
      const items = database.skus
        .filter((sku) => sku.active)
        .map((sku) =>
          dealerCatalogItemSchema.parse({
            id: sku.id,
            code: sku.code,
            name: sku.name,
            category: sku.category,
            uom: sku.uom,
          }),
        );
      const categories = [...new Set(items.map((item) => item.category))].sort();

      response.json(
        dealerCatalogResponseSchema.parse({
          categories,
          items,
        }),
      );
    },
  );

  router.get(
    "/dealer/orders",
    authenticate,
    requireRole("dealer"),
    (request: AuthenticatedRequest, response) => {
      const orders = readDatabase().orders
        .filter((order) => order.dealerId === request.user?.id)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
        .map(toDealerOrderView);

      response.json(orders);
    },
  );

  router.post(
    "/dealer/orders",
    authenticate,
    requireRole("dealer"),
    (request: AuthenticatedRequest, response) => {
      const parsed = createOrderSchema.safeParse(request.body);
      if (!parsed.success) {
        response.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid order payload." });
        return;
      }

      try {
        const order = updateDatabase((database) => {
          const dealer = database.dealers.find((candidate) => candidate.id === request.user?.id);
          if (!dealer || !dealer.active) {
            throw new Error("Dealer account is inactive.");
          }

          return createOrderFromInput(database, dealer, parsed.data.items);
        });

        response.status(201).json(toDealerOrderView(order));
      } catch (error) {
        response.status(400).json({
          message:
            error instanceof Error
              ? error.message
              : "Unable to submit the order right now.",
        });
      }
    },
  );

  router.get(
    "/ho/dashboard",
    authenticate,
    requireRole("head_office"),
    (_request, response) => {
      const database = readDatabase();

      const summary = dashboardSummarySchema.parse({
        pendingCount: database.orders.filter((order) => order.status === "pending").length,
        approvedTodayCount: database.orders.filter(
          (order) => order.status === "approved" && isToday(order.approvedAt),
        ).length,
        rejectedTodayCount: database.orders.filter(
          (order) => order.status === "rejected" && isToday(order.rejectedAt),
        ).length,
        approvedTodayValue: Number(
          database.orders
            .filter((order) => order.status === "approved" && isToday(order.approvedAt))
            .reduce((total, order) => total + (order.netAmount ?? 0), 0)
            .toFixed(2),
        ),
        activeDealers: database.dealers.filter((dealer) => dealer.active).length,
        activeSkus: database.skus.filter((sku) => sku.active).length,
      });

      response.json(summary);
    },
  );

  router.get(
    "/ho/orders",
    authenticate,
    requireRole("head_office"),
    (request, response) => {
      const status = typeof request.query.status === "string" ? request.query.status : "all";

      const orders = readDatabase().orders
        .filter((order) => status === "all" || order.status === status)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

      response.json(orders);
    },
  );

  router.post(
    "/ho/orders/:orderId/approve",
    authenticate,
    requireRole("head_office"),
    (request, response) => {
      const parsed = approveOrderSchema.safeParse(request.body);

      if (!parsed.success) {
        response.status(400).json({ message: parsed.error.issues[0]?.message ?? "Enter a valid discount." });
        return;
      }

      try {
        const exportPayload = updateDatabase((database) => {
          const order = database.orders.find((candidate) => candidate.id === request.params.orderId);
          if (!order) {
            throw new Error("Order not found.");
          }

          if (order.status !== "pending") {
            throw new Error("Only pending orders can be approved.");
          }

          order.status = "approved";
          order.discountPct = parsed.data.discountPct;
          order.netAmount = Number(
            (order.grossAmount * (1 - parsed.data.discountPct / 100)).toFixed(2),
          );
          order.approvedAt = new Date().toISOString();
          order.rejectedAt = null;
          order.remarks = null;

          return {
            ...buildOrderCsv(order),
            order,
          };
        });

        response.json(exportPayload);
      } catch (error) {
        response.status(400).json({
          message:
            error instanceof Error ? error.message : "Unable to approve the order.",
        });
      }
    },
  );

  router.post(
    "/ho/orders/:orderId/reject",
    authenticate,
    requireRole("head_office"),
    (request, response) => {
      const parsed = rejectOrderSchema.safeParse(request.body);
      if (!parsed.success) {
        response.status(400).json({ message: "Invalid rejection payload." });
        return;
      }

      try {
        const order = updateDatabase((database) => {
          const existing = database.orders.find((candidate) => candidate.id === request.params.orderId);
          if (!existing) {
            throw new Error("Order not found.");
          }

          if (existing.status !== "pending") {
            throw new Error("Only pending orders can be rejected.");
          }

          existing.status = "rejected";
          existing.remarks = parsed.data.remarks?.trim() || "Rejected by Head Office";
          existing.rejectedAt = new Date().toISOString();
          existing.discountPct = null;
          existing.netAmount = null;
          existing.approvedAt = null;

          return existing;
        });

        response.json(order);
      } catch (error) {
        response.status(400).json({
          message:
            error instanceof Error ? error.message : "Unable to reject the order.",
        });
      }
    },
  );

  router.get(
    "/ho/orders/:orderId/export",
    authenticate,
    requireRole("head_office"),
    (request, response) => {
      const order = readDatabase().orders.find((candidate) => candidate.id === request.params.orderId);

      if (!order || order.status !== "approved") {
        response.status(404).json({ message: "Approved export file not found." });
        return;
      }

      const payload = buildOrderCsv(order);
      response.setHeader("Content-Type", "text/csv; charset=utf-8");
      response.setHeader(
        "Content-Disposition",
        `attachment; filename=\"${payload.filename}\"`,
      );
      response.send(payload.csv);
    },
  );

  router.get(
    "/ho/dealers",
    authenticate,
    requireRole("head_office"),
    (_request, response) => {
      response.json(readDatabase().dealers.map(sanitizeDealer));
    },
  );

  router.post(
    "/ho/dealers",
    authenticate,
    requireRole("head_office"),
    (request, response) => {
      const parsed = upsertDealerSchema.safeParse(request.body);
      if (!parsed.success) {
        response.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid dealer payload." });
        return;
      }

      try {
        const createdDealer = updateDatabase((database) => {
          const existing = database.dealers.find(
            (dealer) => dealer.code.toLowerCase() === parsed.data.code.toLowerCase(),
          );

          if (existing) {
            throw new Error("Dealer code already exists.");
          }

          const dealer: DealerRecord = {
            id: crypto.randomUUID(),
            code: parsed.data.code,
            name: parsed.data.name,
            region: parsed.data.region,
            contactPerson: parsed.data.contactPerson,
            phone: parsed.data.phone,
            email: parsed.data.email,
            active: parsed.data.active,
            passwordHash: bcrypt.hashSync(parsed.data.password || "dealer123", 10),
          };

          database.dealers.unshift(dealer);
          return sanitizeDealer(dealer);
        });

        response.status(201).json(createdDealer);
      } catch (error) {
        response.status(400).json({
          message:
            error instanceof Error ? error.message : "Unable to create dealer.",
        });
      }
    },
  );

  router.put(
    "/ho/dealers/:dealerId",
    authenticate,
    requireRole("head_office"),
    (request, response) => {
      const parsed = upsertDealerSchema.safeParse(request.body);
      if (!parsed.success) {
        response.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid dealer payload." });
        return;
      }

      try {
        const updatedDealer = updateDatabase((database) => {
          const dealer = database.dealers.find((candidate) => candidate.id === request.params.dealerId);
          if (!dealer) {
            throw new Error("Dealer not found.");
          }

          const duplicate = database.dealers.find(
            (candidate) =>
              candidate.id !== dealer.id &&
              candidate.code.toLowerCase() === parsed.data.code.toLowerCase(),
          );

          if (duplicate) {
            throw new Error("Dealer code already exists.");
          }

          dealer.code = parsed.data.code;
          dealer.name = parsed.data.name;
          dealer.region = parsed.data.region;
          dealer.contactPerson = parsed.data.contactPerson;
          dealer.phone = parsed.data.phone;
          dealer.email = parsed.data.email;
          dealer.active = parsed.data.active;

          if (parsed.data.password) {
            dealer.passwordHash = bcrypt.hashSync(parsed.data.password, 10);
          }

          return sanitizeDealer(dealer);
        });

        response.json(updatedDealer);
      } catch (error) {
        response.status(400).json({
          message:
            error instanceof Error ? error.message : "Unable to update dealer.",
        });
      }
    },
  );

  router.get(
    "/ho/skus",
    authenticate,
    requireRole("head_office"),
    (_request, response) => {
      response.json(readDatabase().skus);
    },
  );

  router.post(
    "/ho/skus",
    authenticate,
    requireRole("head_office"),
    (request, response) => {
      const parsed = upsertSkuSchema.safeParse(request.body);
      if (!parsed.success) {
        response.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid SKU payload." });
        return;
      }

      try {
        const createdSku = updateDatabase((database) => {
          const duplicate = database.skus.find(
            (sku) => sku.code.toLowerCase() === parsed.data.code.toLowerCase(),
          );

          if (duplicate) {
            throw new Error("SKU code already exists.");
          }

          const sku: Sku = skuSchema.parse({
            id: crypto.randomUUID(),
            ...parsed.data,
          });

          database.skus.unshift(sku);
          return sku;
        });

        response.status(201).json(createdSku);
      } catch (error) {
        response.status(400).json({
          message:
            error instanceof Error ? error.message : "Unable to create SKU.",
        });
      }
    },
  );

  router.put(
    "/ho/skus/:skuId",
    authenticate,
    requireRole("head_office"),
    (request, response) => {
      const parsed = upsertSkuSchema.safeParse(request.body);
      if (!parsed.success) {
        response.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid SKU payload." });
        return;
      }

      try {
        const updatedSku = updateDatabase((database) => {
          const sku = database.skus.find((candidate) => candidate.id === request.params.skuId);
          if (!sku) {
            throw new Error("SKU not found.");
          }

          const duplicate = database.skus.find(
            (candidate) =>
              candidate.id !== sku.id &&
              candidate.code.toLowerCase() === parsed.data.code.toLowerCase(),
          );

          if (duplicate) {
            throw new Error("SKU code already exists.");
          }

          sku.code = parsed.data.code;
          sku.name = parsed.data.name;
          sku.category = parsed.data.category;
          sku.uom = parsed.data.uom;
          sku.rate = parsed.data.rate;
          sku.active = parsed.data.active;

          return sku;
        });

        response.json(updatedSku);
      } catch (error) {
        response.status(400).json({
          message:
            error instanceof Error ? error.message : "Unable to update SKU.",
        });
      }
    },
  );

  return router;
}
