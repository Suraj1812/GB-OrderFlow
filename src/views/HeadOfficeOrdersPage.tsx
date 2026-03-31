import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import TaskAltRoundedIcon from "@mui/icons-material/TaskAltRounded";
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  InputAdornment,
  Paper,
  Stack,
  Tab,
  TableContainer,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import axios from "axios";
import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import type { ExportPayload, Order } from "../../shared/contracts";
import { approveOrderSchema } from "../../shared/contracts";
import { apiClient } from "../api/client";
import { useApiQuery } from "../hooks/useApiQuery";
import { downloadTextFile } from "../lib/download";
import { formatCurrency, formatDateTime } from "../lib/format";
import { EmptyState } from "../ui/EmptyState";
import { PageHeader } from "../ui/PageHeader";
import { StatusChip } from "../ui/StatusChip";

type OrderTab = "pending" | "approved" | "rejected";
const PAGE_SIZE = 10;

function isToday(value: string | null) {
  if (!value) {
    return false;
  }

  const now = new Date();
  const date = new Date(value);

  return (
    now.getUTCFullYear() === date.getUTCFullYear() &&
    now.getUTCMonth() === date.getUTCMonth() &&
    now.getUTCDate() === date.getUTCDate()
  );
}

export function HeadOfficeOrdersPage() {
  const [tab, setTab] = useState<OrderTab>("pending");
  const [search, setSearch] = useState("");
  const [discountDrafts, setDiscountDrafts] = useState<Record<string, string>>({});
  const [rejectingOrder, setRejectingOrder] = useState<Order | null>(null);
  const [rejectRemarks, setRejectRemarks] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const deferredSearch = useDeferredValue(search);

  const ordersQuery = useApiQuery(
    async (signal) => {
      const response = await apiClient.get<Order[]>("/ho/orders", { signal });
      return response.data;
    },
    [],
  );

  const orders = ordersQuery.data ?? [];

  const visibleOrders = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesTab =
        tab === "approved"
          ? order.status === "approved" && isToday(order.approvedAt)
          : order.status === tab;

      const matchesQuery =
        !query ||
        order.orderNumber.toLowerCase().includes(query) ||
        order.dealerName.toLowerCase().includes(query) ||
        order.lineItems.some(
          (item) =>
            item.skuCode.toLowerCase().includes(query) ||
            item.skuName.toLowerCase().includes(query),
        );

      return matchesTab && matchesQuery;
    });
  }, [deferredSearch, orders, tab]);

  const renderedOrders = useMemo(
    () => visibleOrders.slice(0, visibleCount),
    [visibleCount, visibleOrders],
  );

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [deferredSearch, tab]);

  async function approveOrder(order: Order) {
    const parsed = approveOrderSchema.safeParse({
      discountPct: discountDrafts[order.id] ?? order.discountPct ?? "",
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Enter a valid discount.");
      return;
    }

    try {
      const response = await apiClient.post<ExportPayload>(
        `/ho/orders/${order.id}/approve`,
        parsed.data,
      );

      downloadTextFile(response.data.filename, response.data.csv);
      toast.success(`Approved ${order.orderNumber} and downloaded ERP CSV.`);
      ordersQuery.refresh();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message ?? "Approval failed.");
      } else {
        toast.error("Approval failed.");
      }
    }
  }

  async function rejectOrder() {
    if (!rejectingOrder) {
      return;
    }

    try {
      await apiClient.post(`/ho/orders/${rejectingOrder.id}/reject`, {
        remarks: rejectRemarks.trim() || undefined,
      });
      toast.success(`${rejectingOrder.orderNumber} rejected.`);
      setRejectingOrder(null);
      setRejectRemarks("");
      ordersQuery.refresh();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message ?? "Rejection failed.");
      } else {
        toast.error("Rejection failed.");
      }
    }
  }

  async function downloadExport(order: Order) {
    try {
      const response = await apiClient.get<string>(`/ho/orders/${order.id}/export`, {
        responseType: "text" as const,
      });
      downloadTextFile(`import-sales-bill-${order.orderNumber}.csv`, response.data);
    } catch {
      toast.error("Unable to download export file.");
    }
  }

  if (ordersQuery.loading) {
    return <Typography color="text.secondary">Loading orders...</Typography>;
  }

  if (!ordersQuery.data) {
    return (
      <EmptyState
        title="Order queue unavailable"
        description={ordersQuery.error ?? "We could not load the queue."}
        actionLabel="Reload"
        onAction={ordersQuery.refresh}
      />
    );
  }

  return (
    <Stack spacing={3.5}>
      <PageHeader
        eyebrow="Order Queue"
        title="Approve, reject, and export"
        description="Every pending order includes full line detail, a Head Office-only discount field, live net preview, and direct ERP CSV generation."
      />

      <Paper sx={{ p: 2.5 }}>
        <Stack spacing={2}>
          <Tabs
            value={tab}
            onChange={(_event, value: OrderTab) =>
              startTransition(() => setTab(value))
            }
          >
            <Tab label="Pending" value="pending" />
            <Tab label="Approved Today" value="approved" />
            <Tab label="Rejected" value="rejected" />
          </Tabs>
          <TextField
            fullWidth
            placeholder="Search order number, dealer, SKU code, or item name"
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
          <Typography color="text.secondary" variant="body2">
            Showing {Math.min(renderedOrders.length, visibleOrders.length)} of{" "}
            {visibleOrders.length} matching orders
          </Typography>
        </Stack>
      </Paper>

      {visibleOrders.length === 0 ? (
        <EmptyState
          title="Nothing to review here"
          description="This queue is currently empty for the selected tab and search criteria."
        />
      ) : (
        <Grid container spacing={3}>
          {renderedOrders.map((order) => {
            const rawDiscount = discountDrafts[order.id] ?? String(order.discountPct ?? "");
            const numericDiscount = Number(rawDiscount);
            const previewNet =
              Number.isFinite(numericDiscount) && rawDiscount !== ""
                ? order.grossAmount * (1 - numericDiscount / 100)
                : order.netAmount;

            return (
              <Grid key={order.id} size={{ xs: 12 }}>
                <Card>
                  <CardContent sx={{ p: 3 }}>
                    <Stack spacing={2.5}>
                      <Stack
                        direction={{ xs: "column", md: "row" }}
                        justifyContent="space-between"
                        spacing={1.5}
                      >
                        <Stack spacing={0.5}>
                          <Typography variant="h4">{order.orderNumber}</Typography>
                          <Typography color="text.secondary">
                            {order.dealerName} · {order.dealerCode} · {formatDateTime(order.createdAt)}
                          </Typography>
                        </Stack>
                        <StatusChip status={order.status} />
                      </Stack>

                      <Box sx={{ display: { xs: "block", md: "none" } }}>
                        <Stack spacing={1.25}>
                          {order.lineItems.map((item) => (
                            <Paper key={item.id} variant="outlined" sx={{ p: 1.5 }}>
                              <Stack spacing={0.5}>
                                <Typography fontWeight={800}>
                                  {item.skuCode} · {item.skuName}
                                </Typography>
                                <Typography color="text.secondary">
                                  Qty {item.qty} · Rate {formatCurrency(item.rate)}
                                </Typography>
                                <Typography color="text.secondary">
                                  Line Total {formatCurrency(item.lineTotal)}
                                </Typography>
                              </Stack>
                            </Paper>
                          ))}
                        </Stack>
                      </Box>

                      <TableContainer
                        sx={{
                          display: { xs: "none", md: "block" },
                          overflowX: "auto",
                        }}
                      >
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>SKU</TableCell>
                              <TableCell>Item</TableCell>
                              <TableCell align="right">Qty</TableCell>
                              <TableCell align="right">Rate</TableCell>
                              <TableCell align="right">Line Total</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {order.lineItems.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell>{item.skuCode}</TableCell>
                                <TableCell>{item.skuName}</TableCell>
                                <TableCell align="right">{item.qty}</TableCell>
                                <TableCell align="right">{formatCurrency(item.rate)}</TableCell>
                                <TableCell align="right">{formatCurrency(item.lineTotal)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>

                      <Paper sx={{ p: 2.5, bgcolor: "rgba(26,26,46,0.03)" }}>
                        <Grid container spacing={2}>
                          <Grid size={{ xs: 12, md: 3 }}>
                            <Typography color="text.secondary">Gross Amount</Typography>
                            <Typography mt={0.5} fontWeight={800}>
                              {formatCurrency(order.grossAmount)}
                            </Typography>
                          </Grid>
                          <Grid size={{ xs: 12, md: 3 }}>
                            <Typography color="text.secondary">Total Quantity</Typography>
                            <Typography mt={0.5} fontWeight={800}>
                              {order.totalQty}
                            </Typography>
                          </Grid>
                          <Grid size={{ xs: 12, md: 3 }}>
                            <Typography color="text.secondary">Discount %</Typography>
                            {order.status === "pending" ? (
                              <TextField
                                size="small"
                                sx={{ mt: 1, maxWidth: 180 }}
                                value={rawDiscount}
                                onChange={(event) =>
                                  setDiscountDrafts((current) => ({
                                    ...current,
                                    [order.id]: event.target.value.replace(/[^\d.]/g, ""),
                                  }))
                                }
                                placeholder="e.g. 8.5"
                              />
                            ) : (
                              <Typography mt={0.5} fontWeight={800}>
                                {order.discountPct?.toFixed(2) ?? "Not applied"}
                              </Typography>
                            )}
                          </Grid>
                          <Grid size={{ xs: 12, md: 3 }}>
                            <Typography color="text.secondary">Net Amount</Typography>
                            <Typography mt={0.5} fontWeight={800}>
                              {formatCurrency(previewNet)}
                            </Typography>
                          </Grid>
                        </Grid>
                      </Paper>

                      {order.remarks ? (
                        <Typography color="text.secondary">
                          Remarks: {order.remarks}
                        </Typography>
                      ) : null}

                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1.5}
                        justifyContent="flex-end"
                      >
                        {order.status === "pending" ? (
                          <>
                            <Button
                              variant="outlined"
                              color="error"
                              onClick={() => {
                                setRejectingOrder(order);
                                setRejectRemarks(order.remarks ?? "");
                              }}
                            >
                              Reject
                            </Button>
                            <Button
                              variant="contained"
                              startIcon={<TaskAltRoundedIcon />}
                              onClick={() => approveOrder(order)}
                            >
                              Approve and export CSV
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="outlined"
                            startIcon={<DownloadRoundedIcon />}
                            onClick={() => downloadExport(order)}
                          >
                            Download export
                          </Button>
                        )}
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
      {renderedOrders.length < visibleOrders.length ? (
        <Stack alignItems="center">
          <Button
            variant="outlined"
            color="inherit"
            onClick={() =>
              setVisibleCount((current) =>
                Math.min(current + PAGE_SIZE, visibleOrders.length),
              )
            }
          >
            Load more orders
          </Button>
        </Stack>
      ) : null}

      <Dialog open={Boolean(rejectingOrder)} onClose={() => setRejectingOrder(null)} fullWidth maxWidth="sm">
        <DialogTitle>Reject order</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <Typography color="text.secondary">
              Add an optional note for the dealer or internal team before rejecting{" "}
              {rejectingOrder?.orderNumber}.
            </Typography>
            <TextField
              multiline
              minRows={4}
              label="Remarks"
              value={rejectRemarks}
              onChange={(event) => setRejectRemarks(event.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button color="inherit" onClick={() => setRejectingOrder(null)}>
            Cancel
          </Button>
          <Button color="error" variant="contained" onClick={rejectOrder}>
            Reject order
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
