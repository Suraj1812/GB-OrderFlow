import { z } from "zod";

export const userRoleSchema = z.enum(["dealer", "head_office"]);
export type UserRole = z.infer<typeof userRoleSchema>;

export const orderStatusSchema = z.enum(["pending", "approved", "rejected"]);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

export const exportStatusSchema = z.enum([
  "pending",
  "processing",
  "completed",
  "failed",
]);
export type ExportStatus = z.infer<typeof exportStatusSchema>;

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(120).optional().default(""),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export const orderListQuerySchema = paginationQuerySchema.extend({
  status: orderStatusSchema.or(z.literal("all")).optional().default("all"),
});
export type OrderListQuery = z.infer<typeof orderListQuerySchema>;

export const catalogQuerySchema = paginationQuerySchema.extend({
  category: z.string().trim().max(60).optional().default("all"),
});
export type CatalogQuery = z.infer<typeof catalogQuerySchema>;

export const paginationMetaSchema = z.object({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  totalItems: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  hasNextPage: z.boolean(),
});
export type PaginationMeta = z.infer<typeof paginationMetaSchema>;

export const dealerSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  region: z.string(),
  contactPerson: z.string(),
  phone: z.string(),
  email: z.string().nullable(),
  active: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Dealer = z.infer<typeof dealerSchema>;

export const skuSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  category: z.string(),
  uom: z.string(),
  rate: z.number().nonnegative(),
  active: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Sku = z.infer<typeof skuSchema>;

export const dealerCatalogItemSchema = skuSchema.pick({
  id: true,
  code: true,
  name: true,
  category: true,
  uom: true,
});
export type DealerCatalogItem = z.infer<typeof dealerCatalogItemSchema>;

export const orderLineItemSchema = z.object({
  id: z.string(),
  skuId: z.string(),
  skuCode: z.string(),
  skuName: z.string(),
  category: z.string(),
  uom: z.string(),
  qty: z.number().int().positive(),
  rate: z.number().nonnegative(),
  lineTotal: z.number().nonnegative(),
});
export type OrderLineItem = z.infer<typeof orderLineItemSchema>;

export const dealerOrderLineItemSchema = orderLineItemSchema.pick({
  id: true,
  skuId: true,
  skuCode: true,
  skuName: true,
  category: true,
  uom: true,
  qty: true,
});
export type DealerOrderLineItem = z.infer<typeof dealerOrderLineItemSchema>;

export const orderSchema = z.object({
  id: z.string(),
  orderNumber: z.string(),
  dealerId: z.string(),
  dealerCode: z.string(),
  dealerName: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  status: orderStatusSchema,
  totalQty: z.number().int().nonnegative(),
  grossAmount: z.number().nonnegative(),
  discountPct: z.number().nullable(),
  netAmount: z.number().nullable(),
  remarks: z.string().nullable(),
  approvedAt: z.string().nullable(),
  rejectedAt: z.string().nullable(),
  exportStatus: exportStatusSchema.nullable().default(null),
  lineItems: z.array(orderLineItemSchema),
});
export type Order = z.infer<typeof orderSchema>;

export const dealerOrderSchema = z.object({
  id: z.string(),
  orderNumber: z.string(),
  dealerCode: z.string(),
  dealerName: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  status: orderStatusSchema,
  totalQty: z.number().int().nonnegative(),
  remarks: z.string().nullable(),
  approvedAt: z.string().nullable(),
  rejectedAt: z.string().nullable(),
  finalVisibleTotal: z.number().nullable(),
  lineItems: z.array(dealerOrderLineItemSchema),
});
export type DealerOrder = z.infer<typeof dealerOrderSchema>;

export const paginatedCatalogResponseSchema = z.object({
  items: z.array(dealerCatalogItemSchema),
  categories: z.array(z.string()),
  pagination: paginationMetaSchema,
});
export type PaginatedCatalogResponse = z.infer<
  typeof paginatedCatalogResponseSchema
>;

export const paginatedDealerOrdersResponseSchema = z.object({
  items: z.array(dealerOrderSchema),
  pagination: paginationMetaSchema,
});
export type PaginatedDealerOrdersResponse = z.infer<
  typeof paginatedDealerOrdersResponseSchema
>;

export const paginatedOrdersResponseSchema = z.object({
  items: z.array(orderSchema),
  pagination: paginationMetaSchema,
});
export type PaginatedOrdersResponse = z.infer<
  typeof paginatedOrdersResponseSchema
>;

export const paginatedDealersResponseSchema = z.object({
  items: z.array(dealerSchema),
  pagination: paginationMetaSchema,
});
export type PaginatedDealersResponse = z.infer<
  typeof paginatedDealersResponseSchema
>;

export const paginatedSkusResponseSchema = z.object({
  items: z.array(skuSchema),
  pagination: paginationMetaSchema,
});
export type PaginatedSkusResponse = z.infer<typeof paginatedSkusResponseSchema>;

export const sessionUserSchema = z.object({
  id: z.string(),
  role: userRoleSchema,
  displayName: z.string(),
  email: z.string().nullable(),
  dealerId: z.string().nullable().optional(),
  dealerCode: z.string().nullable().optional(),
});
export type SessionUser = z.infer<typeof sessionUserSchema>;

export const authResponseSchema = z.object({
  user: sessionUserSchema,
  csrfToken: z.string(),
});
export type AuthResponse = z.infer<typeof authResponseSchema>;

export const dealerLoginSchema = z.object({
  dealerCode: z.string().trim().min(2, "Enter your dealer code."),
  password: z.string().trim().min(8, "Enter your password."),
});
export type DealerLoginInput = z.infer<typeof dealerLoginSchema>;

export const headOfficeLoginSchema = z.object({
  username: z.string().trim().min(3, "Enter your username."),
  password: z.string().trim().min(8, "Enter your password."),
});
export type HeadOfficeLoginInput = z.infer<typeof headOfficeLoginSchema>;

export const forgotPasswordSchema = z.object({
  identifier: z.string().trim().min(3, "Enter your dealer code, username, or email."),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  identifier: z.string().trim().min(3),
  otp: z.string().trim().min(6).max(6),
  newPassword: z.string().trim().min(10).max(120),
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const cartItemInputSchema = z.object({
  skuId: z.string().trim().min(1),
  qty: z.coerce.number().int().positive().max(9999),
});
export type CartItemInput = z.infer<typeof cartItemInputSchema>;

export const createOrderSchema = z.object({
  items: z.array(cartItemInputSchema).min(1, "Add at least one line item."),
});
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const approveOrderSchema = z.object({
  discountPct: z.coerce
    .number()
    .min(0, "Discount cannot be negative.")
    .max(100, "Discount cannot exceed 100."),
});
export type ApproveOrderInput = z.infer<typeof approveOrderSchema>;

export const rejectOrderSchema = z.object({
  remarks: z.string().trim().max(240).optional(),
});
export type RejectOrderInput = z.infer<typeof rejectOrderSchema>;

export const upsertDealerSchema = z.object({
  code: z.string().trim().min(2).max(20),
  name: z.string().trim().min(2).max(120),
  region: z.string().trim().min(2).max(80),
  contactPerson: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(8).max(20),
  email: z.string().trim().email().or(z.literal("")),
  active: z.boolean(),
  password: z
    .string()
    .trim()
    .min(10, "Password should have at least 10 characters.")
    .max(120)
    .optional()
    .or(z.literal("")),
});
export type UpsertDealerInput = z.infer<typeof upsertDealerSchema>;

export const upsertSkuSchema = z.object({
  code: z.string().trim().min(2).max(40),
  name: z.string().trim().min(2).max(160),
  category: z.string().trim().min(2).max(60),
  uom: z.string().trim().min(1).max(12),
  rate: z.coerce.number().positive(),
  active: z.boolean(),
});
export type UpsertSkuInput = z.infer<typeof upsertSkuSchema>;

export const dashboardSummarySchema = z.object({
  pendingCount: z.number().nonnegative(),
  approvedTodayCount: z.number().nonnegative(),
  rejectedTodayCount: z.number().nonnegative(),
  approvedTodayValue: z.number().nonnegative(),
  activeDealers: z.number().nonnegative(),
  activeSkus: z.number().nonnegative(),
});
export type DashboardSummary = z.infer<typeof dashboardSummarySchema>;

export const exportResultSchema = z.object({
  exportId: z.string(),
  orderId: z.string(),
  fileName: z.string().nullable(),
  status: exportStatusSchema,
  downloadUrl: z.string().url().nullable(),
  generatedAt: z.string().nullable(),
});
export type ExportResult = z.infer<typeof exportResultSchema>;

export const healthResponseSchema = z.object({
  ok: z.boolean(),
  environment: z.string(),
});
export type HealthResponse = z.infer<typeof healthResponseSchema>;

export const messageResponseSchema = z.object({
  message: z.string(),
  otpPreview: z.string().optional(),
});
export type MessageResponse = z.infer<typeof messageResponseSchema>;
