import { Prisma, type PrismaClient } from "@prisma/client";

import type { OrderListQuery } from "../../shared/contracts.js";
import type { DatabaseClient } from "../prisma/client.js";

type Tx = Prisma.TransactionClient | PrismaClient;

function buildHeadOfficeOrderWhere(query: OrderListQuery): Prisma.OrderWhereInput {
  return {
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
              dealer: {
                name: {
                  contains: query.search,
                  mode: "insensitive",
                },
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

export class OrderRepository {
  constructor(private readonly db: DatabaseClient) {}

  public transaction<T>(callback: (tx: Prisma.TransactionClient) => Promise<T>) {
    return this.db.$transaction(callback);
  }

  public countOrdersCreatedOn(datePrefix: string, tx: Tx = this.db) {
    return tx.order.count({
      where: {
        orderNumber: {
          startsWith: `GB-${datePrefix}-`,
        },
      },
    });
  }

  public listHeadOfficeOrders(query: OrderListQuery) {
    return this.db.order.findMany({
      where: buildHeadOfficeOrderWhere(query),
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

  public countHeadOfficeOrders(query: OrderListQuery) {
    return this.db.order.count({
      where: buildHeadOfficeOrderWhere(query),
    });
  }

  public findOrderById(orderId: string, tx: Tx = this.db) {
    return tx.order.findUnique({
      where: { id: orderId },
      include: {
        dealer: true,
        orderItems: {
          include: {
            sku: true,
          },
        },
        exports: true,
      },
    });
  }

  public createOrder(
    input: {
      orderNumber: string;
      dealerId: string;
      totalQty: number;
      grossAmount: Prisma.Decimal | number;
      items: Array<{
        skuId: string;
        qty: number;
        rate: Prisma.Decimal | number;
        lineTotal: Prisma.Decimal | number;
      }>;
    },
    tx: Tx = this.db,
  ) {
    return tx.order.create({
      data: {
        orderNumber: input.orderNumber,
        dealerId: input.dealerId,
        totalQty: input.totalQty,
        grossAmount: input.grossAmount,
        orderItems: {
          create: input.items.map((item) => ({
            skuId: item.skuId,
            qty: item.qty,
            rate: item.rate,
            lineTotal: item.lineTotal,
          })),
        },
      },
      include: {
        dealer: true,
        orderItems: {
          include: {
            sku: true,
          },
        },
        exports: true,
      },
    });
  }

  public approveOrder(
    orderId: string,
    discountPct: number,
    netAmount: number,
    tx: Tx = this.db,
  ) {
    return tx.order.update({
      where: { id: orderId },
      data: {
        status: "APPROVED",
        discountPct,
        netAmount,
        approvedAt: new Date(),
        rejectedAt: null,
        remarks: null,
      },
      include: {
        dealer: true,
        orderItems: {
          include: {
            sku: true,
          },
        },
        exports: true,
      },
    });
  }

  public rejectOrder(orderId: string, remarks: string, tx: Tx = this.db) {
    return tx.order.update({
      where: { id: orderId },
      data: {
        status: "REJECTED",
        remarks,
        rejectedAt: new Date(),
        approvedAt: null,
        discountPct: null,
        netAmount: null,
      },
      include: {
        dealer: true,
        orderItems: {
          include: {
            sku: true,
          },
        },
        exports: true,
      },
    });
  }

  public upsertExportRecord(orderId: string, tx: Tx = this.db) {
    return tx.exportHistory.upsert({
      where: { orderId },
      create: {
        orderId,
        status: "PENDING",
      },
      update: {},
    });
  }

  public updateExportRecord(
    exportId: string,
    input: {
      status?: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
      fileName?: string;
      csvSha256?: string;
      csvContent?: string;
      generatedAt?: Date;
      downloadedAt?: Date;
      lastError?: string | null;
    },
  ) {
    return this.db.exportHistory.update({
      where: { id: exportId },
      data: input,
    });
  }

  public findExportById(exportId: string) {
    return this.db.exportHistory.findUnique({
      where: { id: exportId },
      include: {
        order: {
          include: {
            dealer: true,
            orderItems: {
              include: {
                sku: true,
              },
            },
          },
        },
      },
    });
  }

  public findExportByOrderId(orderId: string) {
    return this.db.exportHistory.findUnique({
      where: { orderId },
      include: {
        order: {
          include: {
            dealer: true,
            orderItems: {
              include: {
                sku: true,
              },
            },
          },
        },
      },
    });
  }

  public markExportDownloaded(exportId: string) {
    return this.db.exportHistory.update({
      where: { id: exportId },
      data: {
        downloadedAt: new Date(),
      },
    });
  }

  public async getDashboardSummary() {
    const startOfUtcDay = new Date();
    startOfUtcDay.setUTCHours(0, 0, 0, 0);

    const [pendingCount, approvedTodayCount, rejectedTodayCount, approvedToday, activeDealers, activeSkus] =
      await Promise.all([
        this.db.order.count({ where: { status: "PENDING" } }),
        this.db.order.count({
          where: {
            status: "APPROVED",
            approvedAt: {
              gte: startOfUtcDay,
            },
          },
        }),
        this.db.order.count({
          where: {
            status: "REJECTED",
            rejectedAt: {
              gte: startOfUtcDay,
            },
          },
        }),
        this.db.order.aggregate({
          _sum: {
            netAmount: true,
          },
          where: {
            status: "APPROVED",
            approvedAt: {
              gte: startOfUtcDay,
            },
          },
        }),
        this.db.dealer.count({ where: { active: true } }),
        this.db.sku.count({ where: { active: true } }),
      ]);

    return {
      pendingCount,
      approvedTodayCount,
      rejectedTodayCount,
      approvedTodayValue: Number(approvedToday._sum.netAmount ?? 0),
      activeDealers,
      activeSkus,
    };
  }
}
