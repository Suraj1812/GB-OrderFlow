import crypto from "node:crypto";

import bcrypt from "bcryptjs";
import { AuditAction } from "@prisma/client";

import type {
  ExportResult,
  OrderListQuery,
  PaginationQuery,
  SessionUser,
  UpsertDealerInput,
  UpsertSkuInput,
} from "../../shared/contracts.js";
import {
  orderListQuerySchema,
  paginationQuerySchema,
} from "../../shared/contracts.js";
import { env } from "../config/env.js";
import { buildDeterministicCsv } from "../core/csv.js";
import { AppError } from "../core/errors.js";
import { logger } from "../core/logger.js";
import { buildPaginationMeta } from "../core/pagination.js";
import { createDownloadToken } from "../core/tokens.js";
import { InMemoryTaskQueue } from "../core/queue.js";
import { AuthRepository } from "../repositories/auth.repository.js";
import { MasterRepository } from "../repositories/master.repository.js";
import { OrderRepository } from "../repositories/order.repository.js";
import { mapDealer, mapOrder, mapSku } from "./mappers.js";

function toCents(value: number) {
  return Math.round(value * 100);
}

function fromCents(value: number) {
  return Number((value / 100).toFixed(2));
}

function buildSignedDownloadUrl(exportId: string) {
  return `${env.API_ORIGIN.replace(/\/$/, "")}/api/${env.API_VERSION}/exports/download?token=${createDownloadToken(
    { exportId },
  )}`;
}

export class HeadOfficeService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly masterRepository: MasterRepository,
    private readonly orderRepository: OrderRepository,
    private readonly exportQueue: InMemoryTaskQueue,
  ) {}

  public async getDashboardSummary() {
    return this.orderRepository.getDashboardSummary();
  }

  public async listOrders(query: OrderListQuery) {
    const parsedQuery = orderListQuerySchema.parse(query);
    const [items, totalItems] = await Promise.all([
      this.orderRepository.listHeadOfficeOrders(parsedQuery),
      this.orderRepository.countHeadOfficeOrders(parsedQuery),
    ]);

    return {
      items: items.map(mapOrder),
      pagination: buildPaginationMeta(parsedQuery.page, parsedQuery.pageSize, totalItems),
    };
  }

  private async generateExport(orderId: string, meta?: { requestId?: string; actorId?: string }) {
    const exportRecord = await this.orderRepository.claimExportForProcessing(orderId);

    if (!exportRecord) {
      throw new AppError(404, "EXPORT_NOT_FOUND", "Export record does not exist.");
    }

    if (exportRecord.status === "COMPLETED" && exportRecord.csvContent && exportRecord.fileName) {
      return exportRecord;
    }

    if (exportRecord.status !== "PROCESSING") {
      return exportRecord;
    }

    try {
      const order = await this.orderRepository.findOrderById(orderId);

      if (!order) {
        throw new AppError(404, "ORDER_NOT_FOUND", "Order does not exist.");
      }

      const mappedOrder = mapOrder(order);
      const csv = buildDeterministicCsv(mappedOrder);

      const updated = await this.orderRepository.updateExportRecord(exportRecord.id, {
        status: "COMPLETED",
        fileName: csv.fileName,
        csvSha256: csv.sha256,
        csvContent: csv.content,
        processingStartedAt: null,
        generatedAt: new Date(),
        lastError: null,
      });

      await this.authRepository.createAuditLog({
        userId: meta?.actorId,
        requestId: meta?.requestId,
        action: AuditAction.EXPORT_GENERATED,
        message: `Export generated for order ${mappedOrder.orderNumber}.`,
        dealerCode: mappedOrder.dealerCode,
        metadata: {
          orderId: mappedOrder.id,
          exportId: updated.id,
          sha256: csv.sha256,
        },
      });

      return updated;
    } catch (error) {
      await this.orderRepository.updateExportRecord(exportRecord.id, {
        status: "FAILED",
        processingStartedAt: null,
        lastError: error instanceof Error ? error.message : "Unknown export error",
      });
      throw error;
    }
  }

  private async toExportResult(orderId: string): Promise<ExportResult> {
    const exportRecord = await this.orderRepository.findExportByOrderId(orderId);

    if (!exportRecord) {
      throw new AppError(404, "EXPORT_NOT_READY", "The export is not available yet.");
    }

    return {
      exportId: exportRecord.id,
      orderId,
      fileName: exportRecord.fileName ?? null,
      status: exportRecord.status.toLowerCase() as ExportResult["status"],
      downloadUrl: exportRecord.fileName ? buildSignedDownloadUrl(exportRecord.id) : null,
      generatedAt: exportRecord.generatedAt?.toISOString() ?? null,
      sha256: exportRecord.csvSha256 ?? null,
    };
  }

  private enqueueExport(orderId: string, meta?: { requestId?: string; actorId?: string }) {
    return this.exportQueue.enqueue(`export:${orderId}`, () =>
      this.generateExport(orderId, meta),
    );
  }

  public async approveOrder(
    orderId: string,
    discountPct: number,
    actor: SessionUser,
    meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const prepared = await this.orderRepository.transaction(async (tx) => {
      const order = await this.orderRepository.findOrderById(orderId, tx);

      if (!order) {
        throw new AppError(404, "ORDER_NOT_FOUND", "Order does not exist.");
      }

      if (order.status === "REJECTED") {
        throw new AppError(400, "ORDER_REJECTED", "Rejected orders cannot be approved.");
      }

      if (order.status === "APPROVED") {
        await this.orderRepository.upsertExportRecord(orderId, tx);
        return {
          order,
          changed: false,
        };
      }

      const grossAmountCents = toCents(Number(order.grossAmount.toString()));
      const discountBasisPoints = Math.round(discountPct * 100);
      const netAmount = fromCents(
        Math.round((grossAmountCents * (10_000 - discountBasisPoints)) / 10_000),
      );

      const approvedOrder = await this.orderRepository.approvePendingOrder(
        orderId,
        discountPct,
        netAmount,
        tx,
      );

      if (!approvedOrder) {
        const latestOrder = await this.orderRepository.findOrderById(orderId, tx);

        if (!latestOrder) {
          throw new AppError(404, "ORDER_NOT_FOUND", "Order does not exist.");
        }

        if (latestOrder.status === "REJECTED") {
          throw new AppError(409, "ORDER_ALREADY_REJECTED", "The order has already been rejected.");
        }

        await this.orderRepository.upsertExportRecord(orderId, tx);
        return {
          order: latestOrder,
          changed: false,
        };
      }

      await this.orderRepository.upsertExportRecord(orderId, tx);

      return {
        order: approvedOrder,
        changed: true,
      };
    });

    if (prepared.changed) {
      await this.authRepository.createAuditLog({
        userId: actor.id,
        requestId: meta.requestId,
        action: AuditAction.ORDER_APPROVED,
        email: actor.email,
        message: `Order ${prepared.order.orderNumber} approved.`,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        metadata: {
          orderId: prepared.order.id,
          discountPct,
        },
      });
    }

    void this.enqueueExport(orderId, {
      requestId: meta.requestId,
      actorId: actor.id,
    }).catch((error) => {
      logger.error({ err: error, orderId }, "Export queue task failed after approval");
    });

    return this.toExportResult(orderId);
  }

  public async rejectOrder(
    orderId: string,
    remarks: string,
    actor: SessionUser,
    meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const rejected = await this.orderRepository.transaction(async (tx) => {
      const order = await this.orderRepository.findOrderById(orderId, tx);

      if (!order) {
        throw new AppError(404, "ORDER_NOT_FOUND", "Order does not exist.");
      }

      if (order.status === "APPROVED") {
        throw new AppError(409, "ORDER_ALREADY_APPROVED", "Approved orders cannot be rejected.");
      }

      if (order.status === "REJECTED") {
        return order;
      }

      const updatedOrder = await this.orderRepository.rejectPendingOrder(
        orderId,
        remarks || "Rejected by Head Office",
        tx,
      );

      if (!updatedOrder) {
        const latestOrder = await this.orderRepository.findOrderById(orderId, tx);

        if (!latestOrder) {
          throw new AppError(404, "ORDER_NOT_FOUND", "Order does not exist.");
        }

        if (latestOrder.status === "APPROVED") {
          throw new AppError(409, "ORDER_ALREADY_APPROVED", "Approved orders cannot be rejected.");
        }

        return latestOrder;
      }

      return updatedOrder;
    });

    await this.authRepository.createAuditLog({
      userId: actor.id,
      requestId: meta.requestId,
      action: AuditAction.ORDER_REJECTED,
      email: actor.email,
      message: `Order ${rejected.orderNumber} rejected.`,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: {
        orderId: rejected.id,
        remarks: rejected.remarks,
      },
    });

    return mapOrder(rejected);
  }

  public async getDownloadableExport(exportId: string) {
    const exportRecord = await this.orderRepository.findExportById(exportId);

    if (!exportRecord || !exportRecord.csvContent || !exportRecord.fileName) {
      throw new AppError(404, "EXPORT_NOT_FOUND", "The export file does not exist.");
    }

    const computedSha256 = crypto
      .createHash("sha256")
      .update(exportRecord.csvContent)
      .digest("hex");

    if (exportRecord.csvSha256 && exportRecord.csvSha256 !== computedSha256) {
      throw new AppError(
        409,
        "EXPORT_INTEGRITY_CHECK_FAILED",
        "The export file failed integrity verification.",
      );
    }

    await this.orderRepository.markExportDownloaded(exportId);
    await this.authRepository.createAuditLog({
      userId: undefined,
      action: AuditAction.EXPORT_DOWNLOADED,
      dealerCode: exportRecord.order.dealer.code,
      message: `Export ${exportRecord.fileName} downloaded.`,
      metadata: {
        exportId,
        orderId: exportRecord.orderId,
      },
    });

    return {
      fileName: exportRecord.fileName,
      content: exportRecord.csvContent,
      sha256: exportRecord.csvSha256 ?? computedSha256,
    };
  }

  public async getOrderExport(orderId: string) {
    const order = await this.orderRepository.findOrderById(orderId);

    if (!order) {
      throw new AppError(404, "ORDER_NOT_FOUND", "Order does not exist.");
    }

    if (order.status !== "APPROVED") {
      throw new AppError(400, "EXPORT_NOT_READY", "Only approved orders can be exported.");
    }

    const exportRecord = await this.orderRepository.upsertExportRecord(orderId);

    if (exportRecord.status === "FAILED") {
      await this.orderRepository.updateExportRecord(exportRecord.id, {
        status: "PENDING",
        processingStartedAt: null,
        lastError: null,
      });
    }

    if (exportRecord.status === "FAILED" || exportRecord.status === "PENDING") {
      void this.enqueueExport(orderId).catch((error) => {
        logger.error({ err: error, orderId }, "Export queue task failed on export request");
      });
    }

    return this.toExportResult(orderId);
  }

  public async listDealers(query: PaginationQuery) {
    const parsedQuery = paginationQuerySchema.parse(query);
    const [items, totalItems] = await Promise.all([
      this.masterRepository.listDealers(parsedQuery),
      this.masterRepository.countDealers(parsedQuery),
    ]);

    return {
      items: items.map(mapDealer),
      pagination: buildPaginationMeta(parsedQuery.page, parsedQuery.pageSize, totalItems),
    };
  }

  public async createDealer(input: UpsertDealerInput, actor: SessionUser) {
    return this.masterRepository.transaction(async (tx) => {
      const existingDealer = await this.masterRepository.findDealerByCode(
        input.code,
        tx,
      );

      if (existingDealer) {
        throw new AppError(409, "DEALER_EXISTS", "Dealer code already exists.");
      }

      const passwordHash = await bcrypt.hash(
        input.password || "dealer123456",
        env.BCRYPT_SALT_ROUNDS,
      );

      const dealer = await this.masterRepository.createDealer(
        {
          code: input.code,
          name: input.name,
          region: input.region,
          contactPerson: input.contactPerson,
          phone: input.phone,
          email: input.email || null,
          active: input.active,
        },
        tx,
      );

      await this.masterRepository.createDealerUser(
        {
          dealerId: dealer.id,
          username: input.code,
          displayName: input.name,
          email: input.email || null,
          passwordHash,
          active: input.active,
        },
        tx,
      );

      await this.authRepository.createAuditLog({
        userId: actor.id,
        action: AuditAction.DEALER_CREATED,
        email: actor.email,
        message: `Dealer ${dealer.code} created.`,
        metadata: {
          dealerId: dealer.id,
        },
      });

      return mapDealer(dealer);
    });
  }

  public async updateDealer(
    dealerId: string,
    input: UpsertDealerInput,
    actor: SessionUser,
  ) {
    return this.masterRepository.transaction(async (tx) => {
      const dealer = await this.masterRepository.findDealerById(dealerId, tx);

      if (!dealer) {
        throw new AppError(404, "DEALER_NOT_FOUND", "Dealer does not exist.");
      }

      const duplicate = await this.masterRepository.findDealerByCode(input.code, tx);
      if (duplicate && duplicate.id !== dealerId) {
        throw new AppError(409, "DEALER_EXISTS", "Dealer code already exists.");
      }

      const updatedDealer = await this.masterRepository.updateDealer(
        dealerId,
        {
          code: input.code,
          name: input.name,
          region: input.region,
          contactPerson: input.contactPerson,
          phone: input.phone,
          email: input.email || null,
          active: input.active,
        },
        tx,
      );

      const linkedUser = await this.masterRepository.findDealerUserByDealerId(
        dealerId,
        tx,
      );

      if (!linkedUser) {
        throw new AppError(404, "DEALER_USER_NOT_FOUND", "Linked dealer user does not exist.");
      }

      await this.masterRepository.updateDealerUser(
        linkedUser.id,
        {
          username: input.code,
          displayName: input.name,
          email: input.email || null,
          passwordHash: input.password
            ? await bcrypt.hash(input.password, env.BCRYPT_SALT_ROUNDS)
            : undefined,
          active: input.active,
        },
        tx,
      );

      if (!input.active || input.password) {
        await this.authRepository.revokeAllUserSessions(linkedUser.id);
      }

      await this.authRepository.createAuditLog({
        userId: actor.id,
        action: AuditAction.DEALER_UPDATED,
        email: actor.email,
        message: `Dealer ${updatedDealer.code} updated.`,
        metadata: {
          dealerId: updatedDealer.id,
        },
      });

      return mapDealer(updatedDealer);
    });
  }

  public async listSkus(query: PaginationQuery) {
    const parsedQuery = paginationQuerySchema.parse(query);
    const [items, totalItems] = await Promise.all([
      this.masterRepository.listSkus(parsedQuery),
      this.masterRepository.countSkus(parsedQuery),
    ]);

    return {
      items: items.map(mapSku),
      pagination: buildPaginationMeta(parsedQuery.page, parsedQuery.pageSize, totalItems),
    };
  }

  public async createSku(input: UpsertSkuInput, actor: SessionUser) {
    const existing = await this.masterRepository.findSkuByCode(input.code);
    if (existing) {
      throw new AppError(409, "SKU_EXISTS", "SKU code already exists.");
    }

    const sku = await this.masterRepository.createSku(input);
    await this.authRepository.createAuditLog({
      userId: actor.id,
      action: AuditAction.SKU_CREATED,
      email: actor.email,
      message: `SKU ${sku.code} created.`,
      metadata: {
        skuId: sku.id,
      },
    });
    return mapSku(sku);
  }

  public async updateSku(skuId: string, input: UpsertSkuInput, actor: SessionUser) {
    const sku = await this.masterRepository.findSkuById(skuId);
    if (!sku) {
      throw new AppError(404, "SKU_NOT_FOUND", "SKU does not exist.");
    }

    const duplicate = await this.masterRepository.findSkuByCode(input.code);
    if (duplicate && duplicate.id !== skuId) {
      throw new AppError(409, "SKU_EXISTS", "SKU code already exists.");
    }

    const updated = await this.masterRepository.updateSku(skuId, input);
    await this.authRepository.createAuditLog({
      userId: actor.id,
      action: AuditAction.SKU_UPDATED,
      email: actor.email,
      message: `SKU ${updated.code} updated.`,
      metadata: {
        skuId: updated.id,
      },
    });
    return mapSku(updated);
  }
}
