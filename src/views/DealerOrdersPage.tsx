import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import {
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { startTransition, useDeferredValue, useMemo, useState } from "react";

import type { DealerOrderView } from "../../shared/contracts";
import { apiClient } from "../api/client";
import { useApiQuery } from "../hooks/useApiQuery";
import { formatCurrency, formatDateTime } from "../lib/format";
import { EmptyState } from "../ui/EmptyState";
import { PageHeader } from "../ui/PageHeader";
import { StatusChip } from "../ui/StatusChip";

const statusOptions = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
] as const;

export function DealerOrdersPage() {
  const [statusFilter, setStatusFilter] = useState<(typeof statusOptions)[number]["value"]>("all");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  const ordersQuery = useApiQuery(
    async (signal) => {
      const response = await apiClient.get<DealerOrderView[]>("/dealer/orders", {
        signal,
      });
      return response.data;
    },
    [],
  );

  const orders = ordersQuery.data ?? [];

  const filteredOrders = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesStatus = statusFilter === "all" || order.status === statusFilter;
      const matchesSearch =
        !query ||
        order.orderNumber.toLowerCase().includes(query) ||
        order.lineItems.some(
          (item) =>
            item.skuName.toLowerCase().includes(query) ||
            item.skuCode.toLowerCase().includes(query),
        );

      return matchesStatus && matchesSearch;
    });
  }, [deferredSearch, orders, statusFilter]);

  if (ordersQuery.loading) {
    return <Typography color="text.secondary">Loading orders...</Typography>;
  }

  if (!ordersQuery.data) {
    return (
      <EmptyState
        title="Orders unavailable"
        description={ordersQuery.error ?? "We could not load your order history."}
        actionLabel="Reload"
        onAction={ordersQuery.refresh}
      />
    );
  }

  return (
    <Stack spacing={3.5}>
      <PageHeader
        eyebrow="Order History"
        title="Track every submitted order"
        description="You can review order references, status updates, final approved totals, and any rejection remarks. Discount details remain internal to Head Office."
      />

      <Paper sx={{ p: 2.5 }}>
        <Stack spacing={2}>
          <TextField
            fullWidth
            placeholder="Search by order number, SKU code, or item name"
            value={search}
            onChange={(event) => {
              const nextValue = event.target.value;
              startTransition(() => setSearch(nextValue));
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

      {filteredOrders.length === 0 ? (
        <EmptyState
          title="No matching orders"
          description="Try adjusting the status filter or search term to find a specific order."
        />
      ) : (
        <Grid container spacing={3}>
          {filteredOrders.map((order) => (
            <Grid key={order.id} size={{ xs: 12, xl: 6 }}>
              <Card sx={{ height: "100%" }}>
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
                          direction="row"
                          justifyContent="space-between"
                          spacing={2}
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
            </Grid>
          ))}
        </Grid>
      )}
    </Stack>
  );
}
