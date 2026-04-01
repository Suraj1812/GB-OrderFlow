import { Prisma } from "@prisma/client";
import { AuditAction } from "@prisma/client";

import type {
  CatalogQuery,
  CreateOrderInput,
  OrderListQuery,
  SessionUser,
} from "../../shared/contracts.js";
import {
  catalogQuerySchema,
  createOrderSchema,
  orderListQuerySchema,
} from "../../shared/contracts.js";
import { AppError } from "../core/errors.js";
import { buildPaginationMeta } from "../core/pagination.js";
import { AuthRepository } from "../repositories/auth.repository.js";
import { CatalogRepository } from "../repositories/catalog.repository.js";
import { MasterRepository } from "../repositories/master.repository.js";
import { OrderRepository } from "../repositories/order.repository.js";
import { mapCatalogItem, mapDealerOrder } from "./mappers.js";

function buildOrderNumberPrefix() {
  return new Date().toISOString().slice(0, 10).replaceAll("-", "");
}

function toCents(value: number) {
  return Math.round(value * 100);
}

export class DealerPortalService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly catalogRepository: CatalogRepository,
    private readonly masterRepository: MasterRepository,
    private readonly orderRepository: OrderRepository,
  ) {}

  public async getCatalog(query: CatalogQuery) {
    const parsedQuery = catalogQuerySchema.parse(query);
    const [items, totalItems, categories] = await Promise.all([
      this.catalogRepository.listCatalog(parsedQuery),
      this.catalogRepository.countCatalog(parsedQuery),
      this.catalogRepository.listCategories(),
    ]);

    return {
      items: items.map(mapCatalogItem),
      categories: categories.map((item) => item.category),
      pagination: buildPaginationMeta(parsedQuery.page, parsedQuery.pageSize, totalItems),
    };
  }

  public async getOrders(user: SessionUser, query: OrderListQuery) {
    const parsedQuery = orderListQuerySchema.parse(query);

    if (!user.dealerId) {
      throw new AppError(403, "FORBIDDEN", "Dealer session is not linked to a dealer account.");
    }

    const [items, totalItems] = await Promise.all([
      this.catalogRepository.listDealerOrders(user.dealerId, parsedQuery),
      this.catalogRepository.countDealerOrders(user.dealerId, parsedQuery),
    ]);

    return {
      items: items.map(mapDealerOrder),
      pagination: buildPaginationMeta(parsedQuery.page, parsedQuery.pageSize, totalItems),
    };
  }

  public async createOrder(
    user: SessionUser,
    input: CreateOrderInput,
    meta: { ipAddress?: string; userAgent?: string; requestId?: string },
    idempotencyKey: string,
  ) {
    if (!user.dealerId) {
      throw new AppError(403, "FORBIDDEN", "Dealer session is not linked to a dealer account.");
    }

    const parsedInput = createOrderSchema.parse(input);
    const dealer = await this.masterRepository.findDealerById(user.dealerId);

    if (!dealer || !dealer.active) {
      throw new AppError(403, "FORBIDDEN", "Dealer account is inactive.");
    }

    const existingOrder = await this.orderRepository.findOrderByIdempotencyKey(
      dealer.id,
      idempotencyKey,
    );

    if (existingOrder) {
      return mapDealerOrder(existingOrder);
    }

    const aggregatedItems = new Map<string, number>();
    for (const item of parsedInput.items) {
      aggregatedItems.set(item.skuId, (aggregatedItems.get(item.skuId) ?? 0) + item.qty);
    }

    const skuIds = [...aggregatedItems.keys()];
    const skuRecords = await this.masterRepository.listActiveSkusByIds(skuIds);

    if (skuRecords.length !== skuIds.length) {
      throw new AppError(400, "INVALID_SKU_SELECTION", "One or more items are no longer available.");
    }

    const skuMap = new Map(skuRecords.map((record) => [record.id, record]));

    try {
      const createdOrder = await this.orderRepository.transaction(async (tx) => {
        const previousOrder = await this.orderRepository.findOrderByIdempotencyKey(
          dealer.id,
          idempotencyKey,
          tx,
        );

        if (previousOrder) {
          return previousOrder;
        }

        await this.orderRepository.acquireOrderSequenceLock(tx);

        const prefix = buildOrderNumberPrefix();
        const count = await this.orderRepository.countOrdersCreatedOn(prefix, tx);
        const orderNumber = `GB-${prefix}-${String(count + 1).padStart(4, "0")}`;

        const items = skuIds.map((skuId) => {
          const sku = skuMap.get(skuId);
          if (!sku) {
            throw new AppError(400, "INVALID_SKU_SELECTION", "One or more items are no longer available.");
          }

          const qty = aggregatedItems.get(skuId) ?? 0;
          const rate = Number(sku.rate.toString());
          return {
            skuId,
            qty,
            rate,
            lineTotal: toCents(rate) * qty / 100,
          };
        });

        const totalQty = items.reduce((sum, item) => sum + item.qty, 0);
        const grossAmount = items.reduce((sum, item) => sum + item.lineTotal, 0);

        return this.orderRepository.createOrder(
          {
            orderNumber,
            idempotencyKey,
            dealerId: dealer.id,
            totalQty,
            grossAmount,
            items,
          },
          tx,
        );
      });

      await this.authRepository.createAuditLog({
        userId: user.id,
        requestId: meta.requestId,
        action: AuditAction.ORDER_CREATED,
        dealerCode: user.dealerCode,
        email: user.email,
        message: `Dealer order ${createdOrder.orderNumber} created.`,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        metadata: {
          orderId: createdOrder.id,
          totalQty: createdOrder.totalQty,
          idempotencyKey,
        },
      });

      return mapDealerOrder(createdOrder);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const duplicateOrder = await this.orderRepository.findOrderByIdempotencyKey(
          dealer.id,
          idempotencyKey,
        );

        if (duplicateOrder) {
          return mapDealerOrder(duplicateOrder);
        }
      }

      throw error;
    }
  }
}
