import { Router } from "express";
import type { Request, Response } from "express";

import {
  approveOrderSchema,
  catalogQuerySchema,
  createOrderSchema,
  dealerLoginSchema,
  forgotPasswordSchema,
  headOfficeLoginSchema,
  healthResponseSchema,
  orderListQuerySchema,
  paginationQuerySchema,
  rejectOrderSchema,
  resetPasswordSchema,
  upsertDealerSchema,
  upsertSkuSchema,
} from "../shared/contracts.js";
import { AuthController } from "./controllers/auth.controller.js";
import { DealerController } from "./controllers/dealer.controller.js";
import { ExportController } from "./controllers/export.controller.js";
import { HeadOfficeController } from "./controllers/head-office.controller.js";
import { asyncHandler } from "./http/async-handler.js";
import { authenticate, requireRole } from "./middleware/authenticate.js";
import { authRateLimiter, requireCsrf } from "./middleware/security.js";
import { validateRequest } from "./middleware/validate-request.js";
import { prisma } from "./prisma/client.js";
import { AuthRepository } from "./repositories/auth.repository.js";
import { CatalogRepository } from "./repositories/catalog.repository.js";
import { MasterRepository } from "./repositories/master.repository.js";
import { OrderRepository } from "./repositories/order.repository.js";
import { AuthService } from "./services/auth.service.js";
import { DealerPortalService } from "./services/dealer-portal.service.js";
import { HeadOfficeService } from "./services/head-office.service.js";
import { InMemoryTaskQueue } from "./core/queue.js";
import { env } from "./config/env.js";

export function createRouter() {
  const router = Router();

  const authRepository = new AuthRepository(prisma);
  const catalogRepository = new CatalogRepository(prisma);
  const masterRepository = new MasterRepository(prisma);
  const orderRepository = new OrderRepository(prisma);
  const exportQueue = new InMemoryTaskQueue();

  const authController = new AuthController(new AuthService(authRepository));
  const dealerController = new DealerController(
    new DealerPortalService(
      authRepository,
      catalogRepository,
      masterRepository,
      orderRepository,
    ),
  );
  const headOfficeController = new HeadOfficeController(
    new HeadOfficeService(
      authRepository,
      masterRepository,
      orderRepository,
      exportQueue,
    ),
  );
  const exportController = new ExportController(
    new HeadOfficeService(
      authRepository,
      masterRepository,
      orderRepository,
      exportQueue,
    ),
  );

  router.get("/health", asyncHandler(async (_request: Request, response: Response) => {
    await prisma.$queryRaw`SELECT 1`;
    response.status(200).json(
      healthResponseSchema.parse({
        ok: true,
        environment: env.NODE_ENV,
      }),
    );
  }));

  router.post(
    "/auth/login/dealer",
    authRateLimiter,
    validateRequest({ body: dealerLoginSchema }),
    asyncHandler((request, response) => authController.loginDealer(request, response)),
  );
  router.post(
    "/auth/login/head-office",
    authRateLimiter,
    validateRequest({ body: headOfficeLoginSchema }),
    asyncHandler((request, response) => authController.loginHeadOffice(request, response)),
  );
  router.post(
    "/auth/refresh",
    authRateLimiter,
    asyncHandler((request, response) => authController.refreshSession(request, response)),
  );
  router.get(
    "/auth/me",
    authenticate,
    asyncHandler((request, response) => authController.getCurrentSession(request, response)),
  );
  router.post(
    "/auth/logout",
    authenticate,
    requireCsrf,
    asyncHandler((request, response) => authController.logout(request, response)),
  );
  router.post(
    "/auth/forgot-password",
    authRateLimiter,
    validateRequest({ body: forgotPasswordSchema }),
    asyncHandler((request, response) => authController.requestPasswordReset(request, response)),
  );
  router.post(
    "/auth/reset-password",
    authRateLimiter,
    validateRequest({ body: resetPasswordSchema }),
    asyncHandler((request, response) => authController.resetPassword(request, response)),
  );

  router.get(
    "/dealer/catalog",
    authenticate,
    requireRole("dealer"),
    validateRequest({ query: catalogQuerySchema }),
    asyncHandler((request, response) => dealerController.getCatalog(request, response)),
  );
  router.get(
    "/dealer/orders",
    authenticate,
    requireRole("dealer"),
    validateRequest({ query: orderListQuerySchema }),
    asyncHandler((request, response) => dealerController.getOrders(request, response)),
  );
  router.post(
    "/dealer/orders",
    authenticate,
    requireRole("dealer"),
    requireCsrf,
    validateRequest({ body: createOrderSchema }),
    asyncHandler((request, response) => dealerController.createOrder(request, response)),
  );

  router.get(
    "/ho/dashboard",
    authenticate,
    requireRole("head_office"),
    asyncHandler((request, response) => headOfficeController.getDashboard(request, response)),
  );
  router.get(
    "/ho/orders",
    authenticate,
    requireRole("head_office"),
    validateRequest({ query: orderListQuerySchema }),
    asyncHandler((request, response) => headOfficeController.listOrders(request, response)),
  );
  router.post(
    "/ho/orders/:orderId/approve",
    authenticate,
    requireRole("head_office"),
    requireCsrf,
    validateRequest({ body: approveOrderSchema }),
    asyncHandler((request, response) => headOfficeController.approveOrder(request, response)),
  );
  router.post(
    "/ho/orders/:orderId/reject",
    authenticate,
    requireRole("head_office"),
    requireCsrf,
    validateRequest({ body: rejectOrderSchema }),
    asyncHandler((request, response) => headOfficeController.rejectOrder(request, response)),
  );
  router.get(
    "/ho/orders/:orderId/export",
    authenticate,
    requireRole("head_office"),
    asyncHandler((request, response) => headOfficeController.getOrderExport(request, response)),
  );
  router.get(
    "/ho/dealers",
    authenticate,
    requireRole("head_office"),
    validateRequest({ query: paginationQuerySchema }),
    asyncHandler((request, response) => headOfficeController.listDealers(request, response)),
  );
  router.post(
    "/ho/dealers",
    authenticate,
    requireRole("head_office"),
    requireCsrf,
    validateRequest({ body: upsertDealerSchema }),
    asyncHandler((request, response) => headOfficeController.createDealer(request, response)),
  );
  router.put(
    "/ho/dealers/:dealerId",
    authenticate,
    requireRole("head_office"),
    requireCsrf,
    validateRequest({ body: upsertDealerSchema }),
    asyncHandler((request, response) => headOfficeController.updateDealer(request, response)),
  );
  router.get(
    "/ho/skus",
    authenticate,
    requireRole("head_office"),
    validateRequest({ query: paginationQuerySchema }),
    asyncHandler((request, response) => headOfficeController.listSkus(request, response)),
  );
  router.post(
    "/ho/skus",
    authenticate,
    requireRole("head_office"),
    requireCsrf,
    validateRequest({ body: upsertSkuSchema }),
    asyncHandler((request, response) => headOfficeController.createSku(request, response)),
  );
  router.put(
    "/ho/skus/:skuId",
    authenticate,
    requireRole("head_office"),
    requireCsrf,
    validateRequest({ body: upsertSkuSchema }),
    asyncHandler((request, response) => headOfficeController.updateSku(request, response)),
  );

  router.get(
    "/exports/download",
    asyncHandler((request, response) => exportController.download(request, response)),
  );

  return router;
}
