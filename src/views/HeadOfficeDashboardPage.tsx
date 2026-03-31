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
import { Link as RouterLink } from "react-router-dom";

import type { DashboardSummary, Order } from "../../shared/contracts";
import { apiClient } from "../api/client";
import { useApiQuery } from "../hooks/useApiQuery";
import { formatCurrency, formatDateTime } from "../lib/format";
import { EmptyState } from "../ui/EmptyState";
import { MetricCard } from "../ui/MetricCard";
import { PageHeader } from "../ui/PageHeader";
import { StatusChip } from "../ui/StatusChip";

function sameUtcDay(timestamp: string | null) {
  if (!timestamp) {
    return false;
  }

  const now = new Date();
  const date = new Date(timestamp);

  return (
    now.getUTCFullYear() === date.getUTCFullYear() &&
    now.getUTCMonth() === date.getUTCMonth() &&
    now.getUTCDate() === date.getUTCDate()
  );
}

export function HeadOfficeDashboardPage() {
  const summaryQuery = useApiQuery(
    async (signal) => {
      const response = await apiClient.get<DashboardSummary>("/ho/dashboard", { signal });
      return response.data;
    },
    [],
  );

  const ordersQuery = useApiQuery(
    async (signal) => {
      const response = await apiClient.get<Order[]>("/ho/orders", { signal });
      return response.data;
    },
    [],
  );

  if (summaryQuery.loading || ordersQuery.loading) {
    return <Typography color="text.secondary">Loading dashboard...</Typography>;
  }

  if (!summaryQuery.data || !ordersQuery.data) {
    return (
      <EmptyState
        title="Dashboard unavailable"
        description={
          summaryQuery.error ?? ordersQuery.error ?? "The dashboard could not be loaded."
        }
        actionLabel="Reload"
        onAction={() => {
          summaryQuery.refresh();
          ordersQuery.refresh();
        }}
      />
    );
  }

  const pendingOrders = ordersQuery.data.filter((order) => order.status === "pending").slice(0, 4);
  const approvedToday = ordersQuery.data.filter(
    (order) => order.status === "approved" && sameUtcDay(order.approvedAt),
  );

  return (
    <Stack spacing={3.5}>
      <PageHeader
        eyebrow="Head Office Dashboard"
        title="Operational control at a glance"
        description="Monitor pending approvals, same-day approved value, dealer coverage, and live operational activity without leaving the workspace."
        actions={
          <Button
            component={RouterLink}
            to="/head-office/orders"
            variant="contained"
          >
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
            helper="Orders approved on the current UTC business day"
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
                {pendingOrders.length === 0 ? (
                  <Typography color="text.secondary">
                    No pending orders at the moment.
                  </Typography>
                ) : (
                  <List disablePadding>
                    {pendingOrders.map((order) => (
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
                <Typography variant="h4">Approved today</Typography>
                {approvedToday.length === 0 ? (
                  <Typography color="text.secondary">
                    No orders have been approved yet today.
                  </Typography>
                ) : (
                  approvedToday.map((order) => (
                    <Stack
                      key={order.id}
                      spacing={0.5}
                      py={1.25}
                      borderBottom="1px solid rgba(26,26,46,0.08)"
                    >
                      <Typography fontWeight={800}>{order.orderNumber}</Typography>
                      <Typography color="text.secondary">
                        {order.dealerName} · Discount {order.discountPct?.toFixed(2)}%
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

