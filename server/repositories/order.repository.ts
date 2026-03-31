import { Prisma, type PrismaClient } from "@prisma/client";

import type { OrderListQuery } from "../../shared/contracts.js";
import type { DatabaseClient } from "../prisma/client.js";

type Tx = Prisma.TransactionClient | PrismaClient;

const orderInclude = {
  dealer: true,
  orderItems: {
    include: {
      sku: true,
    },
  },
  exports: true,
} satisfies Prisma.OrderInclude;

const exportInclude = {
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
} satisfies Prisma.ExportHistoryInclude;

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
    return this.db.$transaction(callback, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  }

  public async acquireOrderSequenceLock(tx: Tx = this.db) {
    if ("$queryRaw" in tx) {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(97412026)`;
    }
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
      include: orderInclude,
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
      include: orderInclude,
    });
  }

  public findOrderByIdempotencyKey(
    dealerId: string,
    idempotencyKey: string,
    tx: Tx = this.db,
  ) {
    return tx.order.findFirst({
      where: {
        dealerId,
        idempotencyKey,
      },
      include: orderInclude,
    });
  }

  public createOrder(
    input: {
      orderNumber: string;
      idempotencyKey?: string;
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
        idempotencyKey: input.idempotencyKey,
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
      include: orderInclude,
    });
  }

  public async approvePendingOrder(
    orderId: string,
    discountPct: number,
    netAmount: number,
    tx: Tx = this.db,
  ) {
    const approvedAt = new Date();
    const result = await tx.order.updateMany({
      where: {
        id: orderId,
        status: "PENDING",
      },
      data: {
        status: "APPROVED",
        discountPct,
        netAmount,
        approvedAt,
        rejectedAt: null,
        remarks: null,
      },
    });

    if (result.count === 0) {
      return null;
    }

    return this.findOrderById(orderId, tx);
  }

  public async rejectPendingOrder(orderId: string, remarks: string, tx: Tx = this.db) {
    const rejectedAt = new Date();
    const result = await tx.order.updateMany({
      where: {
        id: orderId,
        status: "PENDING",
      },
      data: {
        status: "REJECTED",
        remarks,
        rejectedAt,
        approvedAt: null,
        discountPct: null,
        netAmount: null,
      },
    });

    if (result.count === 0) {
      return null;
    }

    return this.findOrderById(orderId, tx);
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
      attemptCount?: number | Prisma.IntFieldUpdateOperationsInput;
      processingStartedAt?: Date | null;
      generatedAt?: Date;
      downloadedAt?: Date;
      lastError?: string | null;
    },
    tx: Tx = this.db,
  ) {
    return tx.exportHistory.update({
      where: { id: exportId },
      data: input,
    });
  }

  public async claimExportForProcessing(orderId: string, tx: Tx = this.db) {
    const processingStartedAt = new Date();
    const result = await tx.exportHistory.updateMany({
      where: {
        orderId,
        status: {
          in: ["PENDING", "FAILED"],
        },
      },
      data: {
        status: "PROCESSING",
        processingStartedAt,
        attemptCount: {
          increment: 1,
        },
        lastError: null,
      },
    });

    if (result.count === 0) {
      return this.findExportByOrderId(orderId);
    }

    return this.findExportByOrderId(orderId);
  }

  public findExportById(exportId: string) {
    return this.db.exportHistory.findUnique({
      where: { id: exportId },
      include: exportInclude,
    });
  }

  public findExportByOrderId(orderId: string) {
    return this.db.exportHistory.findUnique({
      where: { orderId },
      include: exportInclude,
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
