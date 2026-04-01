import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import {
  Box,
  Card,
  CardContent,
  Chip,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { startTransition, useEffect, useState } from "react";

import type { OrderListQuery, PaginatedDealerOrdersResponse } from "../../shared/contracts";
import { apiClient, getApiErrorMessage } from "../api/client";
import { queryKeys } from "../api/query-keys";
import { formatCurrency, formatDateTime } from "../lib/format";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { EmptyState } from "../ui/EmptyState";
import { LoadingPanel } from "../ui/LoadingPanel";
import { PageHeader } from "../ui/PageHeader";
import { PaginationBar } from "../ui/PaginationBar";
import { StatusChip } from "../ui/StatusChip";

const statusOptions = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
] as const;

export function DealerOrdersPage() {
  const [statusFilter, setStatusFilter] = useState<OrderListQuery["status"]>("all");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(searchInput, 250);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  const queryState: OrderListQuery = {
    page,
    pageSize: 10,
    search: debouncedSearch.trim(),
    status: statusFilter,
  };

  const ordersQuery = useQuery({
    queryKey: queryKeys.dealerOrders(queryState),
    queryFn: async () => {
      const response = await apiClient.get<PaginatedDealerOrdersResponse>("/dealer/orders", {
        params: queryState,
      });
      return response.data;
    },
    placeholderData: keepPreviousData,
  });

  if (ordersQuery.isPending) {
    return <LoadingPanel rows={5} />;
  }

  if (ordersQuery.isError || !ordersQuery.data) {
    return (
      <EmptyState
        title="Orders unavailable"
        description={getApiErrorMessage(ordersQuery.error, "We could not load your order history.")}
        actionLabel="Reload"
        onAction={() => void ordersQuery.refetch()}
      />
    );
  }

  return (
    <Stack spacing={3.5}>
      <PageHeader
        eyebrow="Order History"
        title="Track every submitted order"
        description="Search by order reference or item, filter by status, and review final approved totals without exposing internal discount logic."
      />

      <Paper sx={{ p: 2.5 }}>
        <Stack spacing={2}>
          <TextField
            fullWidth
            placeholder="Search by order number, SKU code, or item name"
            value={searchInput}
            onChange={(event) => {
              const value = event.target.value;
              startTransition(() => setSearchInput(value));
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon />
                </InputAdornment>
              ),
            }}
          />
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {statusOptions.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                color={statusFilter === option.value ? "secondary" : "default"}
                variant={statusFilter === option.value ? "filled" : "outlined"}
                onClick={() => startTransition(() => setStatusFilter(option.value))}
              />
            ))}
          </Stack>
        </Stack>
      </Paper>

      {ordersQuery.data.items.length === 0 ? (
        <EmptyState
          title="No matching orders"
          description="Try a broader search or another status to find the order you need."
        />
      ) : (
        <>
          <Stack spacing={2.5}>
            {ordersQuery.data.items.map((order) => (
              <Card key={order.id}>
                <CardContent sx={{ p: 3 }}>
                  <Stack spacing={2}>
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      justifyContent="space-between"
                      spacing={1.5}
                    >
                      <Box>
                        <Typography variant="h5">{order.orderNumber}</Typography>
                        <Typography mt={0.75} color="text.secondary">
                          Submitted {formatDateTime(order.createdAt)}
                        </Typography>
                      </Box>
                      <StatusChip status={order.status} />
                    </Stack>

                    <Paper sx={{ p: 2, bgcolor: "rgba(26,26,46,0.03)" }}>
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1.5}
                        justifyContent="space-between"
                      >
                        <Typography color="text.secondary">
                          {order.lineItems.length} line items · {order.totalQty} total quantity
                        </Typography>
                        <Typography fontWeight={800}>
                          Final total: {formatCurrency(order.finalVisibleTotal)}
                        </Typography>
                      </Stack>
                    </Paper>

                    <Stack spacing={1.25}>
                      {order.lineItems.map((item) => (
                        <Stack
                          key={item.id}
                          direction={{ xs: "column", sm: "row" }}
                          justifyContent="space-between"
                          spacing={0.5}
                        >
                          <Typography color="text.secondary">
                            {item.skuCode} · {item.skuName}
                          </Typography>
                          <Typography fontWeight={700}>Qty {item.qty}</Typography>
                        </Stack>
                      ))}
                    </Stack>

                    {order.remarks ? (
                      <Paper sx={{ p: 2 }}>
                        <Typography fontWeight={700}>Head Office note</Typography>
                        <Typography mt={0.75} color="text.secondary">
                          {order.remarks}
                        </Typography>
                      </Paper>
                    ) : null}
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
          <PaginationBar
            page={ordersQuery.data.pagination.page}
            totalPages={ordersQuery.data.pagination.totalPages}
            totalItems={ordersQuery.data.pagination.totalItems}
            onPageChange={setPage}
          />
        </>
      )}
    </Stack>
  );
}
