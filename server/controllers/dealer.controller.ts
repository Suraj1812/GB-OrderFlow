import type { Request, Response } from "express";

import type { CatalogQuery, OrderListQuery } from "../../shared/contracts.js";
import type { AuthenticatedRequest } from "../middleware/authenticate.js";
import { DealerPortalService } from "../services/dealer-portal.service.js";
import { getRequestMeta, getSessionUser } from "./controller.utils.js";

export class DealerController {
  constructor(private readonly service: DealerPortalService) {}

  public async getCatalog(request: Request, response: Response) {
    const result = await this.service.getCatalog(request.query as unknown as CatalogQuery);
    response.status(200).json(result);
  }

  public async getOrders(request: AuthenticatedRequest, response: Response) {
    const result = await this.service.getOrders(
      getSessionUser(request),
      request.query as unknown as OrderListQuery,
    );
    response.status(200).json(result);
  }

  public async createOrder(request: AuthenticatedRequest, response: Response) {
    const result = await this.service.createOrder(
      getSessionUser(request),
      request.body,
      getRequestMeta(request),
    );
    response.status(201).json(result);
  }
}
