import { Prisma, type PrismaClient } from "@prisma/client";

import type { PaginationQuery } from "../../shared/contracts.js";
import type { DatabaseClient } from "../prisma/client.js";

type Tx = Prisma.TransactionClient | PrismaClient;

function buildDealerWhere(query: PaginationQuery): Prisma.DealerWhereInput {
  return query.search
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
          {
            region: {
              contains: query.search,
              mode: "insensitive",
            },
          },
          {
            contactPerson: {
              contains: query.search,
              mode: "insensitive",
            },
          },
        ],
      }
    : {};
}

function buildSkuWhere(query: PaginationQuery): Prisma.SkuWhereInput {
  return query.search
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
          {
            category: {
              contains: query.search,
              mode: "insensitive",
            },
          },
        ],
      }
    : {};
}

export class MasterRepository {
  constructor(private readonly db: DatabaseClient) {}

  public transaction<T>(callback: (tx: Prisma.TransactionClient) => Promise<T>) {
    return this.db.$transaction(callback);
  }

  public listDealers(query: PaginationQuery) {
    return this.db.dealer.findMany({
      where: buildDealerWhere(query),
      orderBy: [{ active: "desc" }, { name: "asc" }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    });
  }

  public countDealers(query: PaginationQuery) {
    return this.db.dealer.count({
      where: buildDealerWhere(query),
    });
  }

  public findDealerById(dealerId: string, tx: Tx = this.db) {
    return tx.dealer.findUnique({
      where: { id: dealerId },
    });
  }

  public findDealerByCode(code: string, tx: Tx = this.db) {
    return tx.dealer.findFirst({
      where: {
        code: {
          equals: code,
          mode: "insensitive",
        },
      },
    });
  }

  public createDealer(
    input: {
      code: string;
      name: string;
      region: string;
      contactPerson: string;
      phone: string;
      email: string | null;
      active: boolean;
    },
    tx: Tx = this.db,
  ) {
    return tx.dealer.create({
      data: input,
    });
  }

  public updateDealer(
    dealerId: string,
    input: {
      code: string;
      name: string;
      region: string;
      contactPerson: string;
      phone: string;
      email: string | null;
      active: boolean;
    },
    tx: Tx = this.db,
  ) {
    return tx.dealer.update({
      where: { id: dealerId },
      data: input,
    });
  }

  public listSkus(query: PaginationQuery) {
    return this.db.sku.findMany({
      where: buildSkuWhere(query),
      orderBy: [{ active: "desc" }, { category: "asc" }, { code: "asc" }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    });
  }

  public countSkus(query: PaginationQuery) {
    return this.db.sku.count({
      where: buildSkuWhere(query),
    });
  }

  public findSkuById(skuId: string, tx: Tx = this.db) {
    return tx.sku.findUnique({
      where: { id: skuId },
    });
  }

  public findSkuByCode(code: string, tx: Tx = this.db) {
    return tx.sku.findFirst({
      where: {
        code: {
          equals: code,
          mode: "insensitive",
        },
      },
    });
  }

  public createSku(
    input: {
      code: string;
      name: string;
      category: string;
      uom: string;
      rate: number;
      active: boolean;
    },
    tx: Tx = this.db,
  ) {
    return tx.sku.create({
      data: input,
    });
  }

  public updateSku(
    skuId: string,
    input: {
      code: string;
      name: string;
      category: string;
      uom: string;
      rate: number;
      active: boolean;
    },
    tx: Tx = this.db,
  ) {
    return tx.sku.update({
      where: { id: skuId },
      data: input,
    });
  }

  public listActiveSkusByIds(skuIds: string[], tx: Tx = this.db) {
    return tx.sku.findMany({
      where: {
        id: {
          in: skuIds,
        },
        active: true,
      },
    });
  }

  public findDealerUserByDealerId(dealerId: string, tx: Tx = this.db) {
    return tx.user.findFirst({
      where: {
        dealerId,
        role: "DEALER",
      },
      include: {
        dealer: true,
      },
    });
  }

  public createDealerUser(
    input: {
      dealerId: string;
      username: string;
      displayName: string;
      email: string | null;
      passwordHash: string;
      active: boolean;
    },
    tx: Tx = this.db,
  ) {
    return tx.user.create({
      data: {
        dealerId: input.dealerId,
        username: input.username,
        displayName: input.displayName,
        email: input.email,
        passwordHash: input.passwordHash,
        role: "DEALER",
        active: input.active,
      },
      include: {
        dealer: true,
      },
    });
  }

  public updateDealerUser(
    userId: string,
    input: {
      username: string;
      displayName: string;
      email: string | null;
      passwordHash?: string;
      active: boolean;
    },
    tx: Tx = this.db,
  ) {
    return tx.user.update({
      where: { id: userId },
      data: {
        username: input.username,
        displayName: input.displayName,
        email: input.email,
        active: input.active,
        ...(input.passwordHash ? { passwordHash: input.passwordHash } : {}),
      },
      include: {
        dealer: true,
      },
    });
  }
}

