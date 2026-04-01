import type { Request, Response } from "express";

import type { OrderListQuery, PaginationQuery } from "../../shared/contracts.js";
import type { AuthenticatedRequest } from "../middleware/authenticate.js";
import { HeadOfficeService } from "../services/head-office.service.js";
import { getRequestMeta, getRequiredParam, getSessionUser } from "./controller.utils.js";

export class HeadOfficeController {
  constructor(private readonly service: HeadOfficeService) {}

  public async getDashboard(_request: Request, response: Response) {
    const result = await this.service.getDashboardSummary();
    response.status(200).json(result);
  }

  public async listOrders(request: Request, response: Response) {
    const result = await this.service.listOrders(
      request.query as unknown as OrderListQuery,
    );
    response.status(200).json(result);
  }

  public async approveOrder(request: AuthenticatedRequest, response: Response) {
    const result = await this.service.approveOrder(
      getRequiredParam(request.params.orderId, "Order id"),
      request.body.discountPct,
      getSessionUser(request),
      getRequestMeta(request),
    );
    response.status(200).json(result);
  }

  public async rejectOrder(request: AuthenticatedRequest, response: Response) {
    const result = await this.service.rejectOrder(
      getRequiredParam(request.params.orderId, "Order id"),
      request.body.remarks ?? "",
      getSessionUser(request),
      getRequestMeta(request),
    );
    response.status(200).json(result);
  }

  public async getOrderExport(request: Request, response: Response) {
    const result = await this.service.getOrderExport(
      getRequiredParam(request.params.orderId, "Order id"),
    );
    response.status(200).json(result);
  }

  public async listDealers(request: Request, response: Response) {
    const result = await this.service.listDealers(
      request.query as unknown as PaginationQuery,
    );
    response.status(200).json(result);
  }

  public async createDealer(request: AuthenticatedRequest, response: Response) {
    const result = await this.service.createDealer(request.body, getSessionUser(request));
    response.status(201).json(result);
  }

  public async updateDealer(request: AuthenticatedRequest, response: Response) {
    const result = await this.service.updateDealer(
      getRequiredParam(request.params.dealerId, "Dealer id"),
      request.body,
      getSessionUser(request),
    );
    response.status(200).json(result);
  }

  public async listSkus(request: Request, response: Response) {
    const result = await this.service.listSkus(
      request.query as unknown as PaginationQuery,
    );
    response.status(200).json(result);
  }

  public async createSku(request: AuthenticatedRequest, response: Response) {
    const result = await this.service.createSku(request.body, getSessionUser(request));
    response.status(201).json(result);
  }

  public async updateSku(request: AuthenticatedRequest, response: Response) {
    const result = await this.service.updateSku(
      getRequiredParam(request.params.skuId, "SKU id"),
      request.body,
      getSessionUser(request),
    );
    response.status(200).json(result);
  }
}
