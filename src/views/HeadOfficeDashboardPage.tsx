import AssignmentRoundedIcon from "@mui/icons-material/AssignmentRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CurrencyRupeeRoundedIcon from "@mui/icons-material/CurrencyRupeeRounded";
import GroupRoundedIcon from "@mui/icons-material/GroupRounded";
import {
  Button,
  Card,
  CardContent,
  Grid,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Link as RouterLink } from "react-router-dom";

import type { DashboardSummary, PaginatedOrdersResponse } from "../../shared/contracts";
import { apiClient, getApiErrorMessage } from "../api/client";
import { queryKeys } from "../api/query-keys";
import { formatCurrency, formatDateTime } from "../lib/format";
import { EmptyState } from "../ui/EmptyState";
import { LoadingPanel } from "../ui/LoadingPanel";
import { MetricCard } from "../ui/MetricCard";
import { PageHeader } from "../ui/PageHeader";
import { StatusChip } from "../ui/StatusChip";

export function HeadOfficeDashboardPage() {
  const summaryQuery = useQuery({
    queryKey: queryKeys.dashboardSummary,
    queryFn: async () => {
      const response = await apiClient.get<DashboardSummary>("/ho/dashboard");
      return response.data;
    },
  });

  const pendingOrdersQuery = useQuery({
    queryKey: queryKeys.headOfficeOrders({
      page: 1,
      pageSize: 4,
      search: "",
      status: "pending",
    }),
    queryFn: async () => {
      const response = await apiClient.get<PaginatedOrdersResponse>("/ho/orders", {
        params: {
          page: 1,
          pageSize: 4,
          search: "",
          status: "pending",
        },
      });
      return response.data;
    },
    placeholderData: keepPreviousData,
  });

  const approvedOrdersQuery = useQuery({
    queryKey: queryKeys.headOfficeOrders({
      page: 1,
      pageSize: 4,
      search: "",
      status: "approved",
    }),
    queryFn: async () => {
      const response = await apiClient.get<PaginatedOrdersResponse>("/ho/orders", {
        params: {
          page: 1,
          pageSize: 4,
          search: "",
          status: "approved",
        },
      });
      return response.data;
    },
    placeholderData: keepPreviousData,
  });

  if (summaryQuery.isPending || pendingOrdersQuery.isPending || approvedOrdersQuery.isPending) {
    return <LoadingPanel rows={6} />;
  }

  if (
    summaryQuery.isError ||
    pendingOrdersQuery.isError ||
    approvedOrdersQuery.isError ||
    !summaryQuery.data ||
    !pendingOrdersQuery.data ||
    !approvedOrdersQuery.data
  ) {
    return (
      <EmptyState
        title="Dashboard unavailable"
        description={getApiErrorMessage(
          summaryQuery.error ?? pendingOrdersQuery.error ?? approvedOrdersQuery.error,
          "The dashboard could not be loaded.",
        )}
        actionLabel="Reload"
        onAction={() => {
          void summaryQuery.refetch();
          void pendingOrdersQuery.refetch();
          void approvedOrdersQuery.refetch();
        }}
      />
    );
  }

  return (
    <Stack spacing={3.5}>
      <PageHeader
        eyebrow="Head Office Dashboard"
        title="Operational control at a glance"
        description="Monitor pending approvals, today’s cleared value, dealer coverage, and recent activity from one secure control room."
        actions={
          <Button component={RouterLink} to="/head-office/orders" variant="contained">
            Open order queue
          </Button>
        }
      />

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6, xl: 3 }}>
          <MetricCard
            label="Pending Queue"
            value={`${summaryQuery.data.pendingCount}`}
            helper="Orders currently awaiting review"
            icon={AssignmentRoundedIcon}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6, xl: 3 }}>
          <MetricCard
            label="Approved Today"
            value={`${summaryQuery.data.approvedTodayCount}`}
            helper="Orders approved during the current UTC day"
            icon={CheckCircleRoundedIcon}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6, xl: 3 }}>
          <MetricCard
            label="Approved Value"
            value={formatCurrency(summaryQuery.data.approvedTodayValue)}
            helper="Net value cleared for ERP export today"
            icon={CurrencyRupeeRoundedIcon}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6, xl: 3 }}>
          <MetricCard
            label="Active Dealers"
            value={`${summaryQuery.data.activeDealers}`}
            helper={`${summaryQuery.data.activeSkus} active SKUs in master`}
            icon={GroupRoundedIcon}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, xl: 7 }}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Stack spacing={2.5}>
                <Typography variant="h4">Pending review right now</Typography>
                {pendingOrdersQuery.data.items.length === 0 ? (
                  <Typography color="text.secondary">
                    No pending orders at the moment.
                  </Typography>
                ) : (
                  <List disablePadding>
                    {pendingOrdersQuery.data.items.map((order) => (
                      <ListItem
                        key={order.id}
                        disableGutters
                        sx={{
                          py: 1.5,
                          borderBottom: "1px solid rgba(26,26,46,0.08)",
                          "&:last-of-type": { borderBottom: "none", pb: 0 },
                        }}
                      >
                        <ListItemText
                          primary={`${order.orderNumber} · ${order.dealerName}`}
                          secondary={`${order.totalQty} qty · ${order.lineItems.length} lines · ${formatDateTime(order.createdAt)}`}
                        />
                        <StatusChip status={order.status} />
                      </ListItem>
                    ))}
                  </List>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, xl: 5 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent sx={{ p: 3 }}>
              <Stack spacing={2.5}>
                <Typography variant="h4">Recently approved</Typography>
                {approvedOrdersQuery.data.items.length === 0 ? (
                  <Typography color="text.secondary">
                    No approved orders available yet.
                  </Typography>
                ) : (
                  approvedOrdersQuery.data.items.map((order) => (
                    <Stack
                      key={order.id}
                      spacing={0.5}
                      py={1.25}
                      borderBottom="1px solid rgba(26,26,46,0.08)"
                    >
                      <Typography fontWeight={800}>{order.orderNumber}</Typography>
                      <Typography color="text.secondary">
                        {order.dealerName} · Discount {order.discountPct?.toFixed(2) ?? "0.00"}%
                      </Typography>
                      <Typography color="text.secondary">
                        Net value {formatCurrency(order.netAmount)}
                      </Typography>
                    </Stack>
                  ))
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}
