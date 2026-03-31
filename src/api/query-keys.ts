import type { CatalogQuery, OrderListQuery, PaginationQuery } from "../../shared/contracts";

export const queryKeys = {
  session: ["session"] as const,
  dealerCatalog: (query: CatalogQuery) => ["dealer-catalog", query] as const,
  dealerOrders: (query: OrderListQuery) => ["dealer-orders", query] as const,
  dashboardSummary: ["dashboard-summary"] as const,
  headOfficeOrders: (query: OrderListQuery) => ["head-office-orders", query] as const,
  dealers: (query: PaginationQuery) => ["dealers", query] as const,
  skus: (query: PaginationQuery) => ["skus", query] as const,
};
