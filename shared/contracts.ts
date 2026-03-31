import { z } from "zod";

export const userRoleSchema = z.enum(["dealer", "head_office"]);
export type UserRole = z.infer<typeof userRoleSchema>;

export const orderStatusSchema = z.enum(["pending", "approved", "rejected"]);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

export const dealerSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  region: z.string(),
  contactPerson: z.string(),
  phone: z.string(),
  email: z.string().email().or(z.literal("")),
  active: z.boolean(),
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
  status: orderStatusSchema,
  totalQty: z.number().int().nonnegative(),
  grossAmount: z.number().nonnegative(),
  discountPct: z.number().min(0).max(100).nullable(),
  netAmount: z.number().nonnegative().nullable(),
  remarks: z.string().nullable(),
  approvedAt: z.string().nullable(),
  rejectedAt: z.string().nullable(),
  lineItems: z.array(orderLineItemSchema),
});
export type Order = z.infer<typeof orderSchema>;

export const dealerLoginSchema = z.object({
  dealerCode: z.string().trim().min(2, "Enter your dealer code."),
  password: z.string().trim().min(6, "Enter your password."),
});
export type DealerLoginInput = z.infer<typeof dealerLoginSchema>;

export const headOfficeLoginSchema = z.object({
  username: z.string().trim().min(3, "Enter your username."),
  password: z.string().trim().min(6, "Enter your password."),
});
export type HeadOfficeLoginInput = z.infer<typeof headOfficeLoginSchema>;

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
    .min(6, "Password should have at least 6 characters.")
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

export const authSessionSchema = z.object({
  token: z.string(),
  role: userRoleSchema,
  displayName: z.string(),
  dealerCode: z.string().optional(),
});
export type AuthSession = z.infer<typeof authSessionSchema>;

export const dealerCatalogResponseSchema = z.object({
  categories: z.array(z.string()),
  items: z.array(dealerCatalogItemSchema),
});
export type DealerCatalogResponse = z.infer<typeof dealerCatalogResponseSchema>;

export const dealerOrderViewSchema = z.object({
  id: z.string(),
  orderNumber: z.string(),
  dealerCode: z.string(),
  dealerName: z.string(),
  createdAt: z.string(),
  status: orderStatusSchema,
  totalQty: z.number().int().nonnegative(),
  remarks: z.string().nullable(),
  approvedAt: z.string().nullable(),
  rejectedAt: z.string().nullable(),
  lineItems: z.array(dealerOrderLineItemSchema),
  finalVisibleTotal: z.number().nonnegative().nullable(),
});
export type DealerOrderView = z.infer<typeof dealerOrderViewSchema>;

export const dashboardSummarySchema = z.object({
  pendingCount: z.number().nonnegative(),
  approvedTodayCount: z.number().nonnegative(),
  rejectedTodayCount: z.number().nonnegative(),
  approvedTodayValue: z.number().nonnegative(),
  activeDealers: z.number().nonnegative(),
  activeSkus: z.number().nonnegative(),
});
export type DashboardSummary = z.infer<typeof dashboardSummarySchema>;

export const exportPayloadSchema = z.object({
  filename: z.string(),
  csv: z.string(),
  order: orderSchema,
});
export type ExportPayload = z.infer<typeof exportPayloadSchema>;
