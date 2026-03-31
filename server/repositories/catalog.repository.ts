import { Prisma } from "@prisma/client";

import type { CatalogQuery, OrderListQuery } from "../../shared/contracts.js";
import type { DatabaseClient } from "../prisma/client.js";

function buildCatalogWhere(query: CatalogQuery): Prisma.SkuWhereInput {
  return {
    active: true,
    ...(query.category !== "all" ? { category: query.category } : {}),
    ...(query.search
      ? {
          OR: [
            {
              code: {
                contains: query.search,
                mode: "insensitive",
              },
            },
            {
              name: {
                contains: query.search,
                mode: "insensitive",
              },
            },
          ],
        }
      : {}),
  };
}

function buildDealerOrderWhere(
  dealerId: string,
  query: OrderListQuery,
): Prisma.OrderWhereInput {
  return {
    dealerId,
    ...(query.status !== "all"
      ? {
          status: query.status.toUpperCase() as "PENDING" | "APPROVED" | "REJECTED",
        }
      : {}),
    ...(query.search
      ? {
          OR: [
            {
              orderNumber: {
                contains: query.search,
                mode: "insensitive",
              },
            },
            {
              orderItems: {
                some: {
                  OR: [
                    {
                      sku: {
                        code: {
                          contains: query.search,
                          mode: "insensitive",
                        },
                      },
                    },
                    {
                      sku: {
                        name: {
                          contains: query.search,
                          mode: "insensitive",
                        },
                      },
                    },
                  ],
                },
              },
            },
          ],
        }
      : {}),
  };
}

export class CatalogRepository {
  constructor(private readonly db: DatabaseClient) {}

  public listCategories() {
    return this.db.sku.findMany({
      where: { active: true },
      distinct: ["category"],
      select: { category: true },
      orderBy: { category: "asc" },
    });
  }

  public listCatalog(query: CatalogQuery) {
    const where = buildCatalogWhere(query);

    return this.db.sku.findMany({
      where,
      select: {
        id: true,
        code: true,
        name: true,
        category: true,
        uom: true,
      },
      orderBy: [{ category: "asc" }, { code: "asc" }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    });
  }

  public countCatalog(query: CatalogQuery) {
    return this.db.sku.count({
      where: buildCatalogWhere(query),
    });
  }

  public listDealerOrders(dealerId: string, query: OrderListQuery) {
    return this.db.order.findMany({
      where: buildDealerOrderWhere(dealerId, query),
      include: {
        dealer: true,
        orderItems: {
          include: {
            sku: true,
          },
        },
        exports: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    });
  }

  public countDealerOrders(dealerId: string, query: OrderListQuery) {
    return this.db.order.count({
      where: buildDealerOrderWhere(dealerId, query),
    });
  }
}

