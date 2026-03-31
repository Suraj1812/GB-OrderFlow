import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import type {
  ExportResult,
  Order,
  OrderListQuery,
  PaginatedOrdersResponse,
} from "../../shared/contracts";
import { approveOrderSchema } from "../../shared/contracts";
import { apiClient, getApiErrorMessage } from "../api/client";
import { queryKeys } from "../api/query-keys";
import { triggerFileDownload } from "../lib/download";
import { formatCurrency, formatDateTime } from "../lib/format";
import { EmptyState } from "../ui/EmptyState";
import { LoadingPanel } from "../ui/LoadingPanel";
import { PageHeader } from "../ui/PageHeader";
import { PaginationBar } from "../ui/PaginationBar";
import { StatusChip } from "../ui/StatusChip";

type OrderTab = "pending" | "approved" | "rejected";

function ExportStatusBadge({ status }: { status: Order["exportStatus"] }) {
  if (status === "completed") {
    return <Chip size="small" color="success" label="CSV ready" />;
  }

  if (status === "failed") {
    return <Chip size="small" color="error" label="CSV failed" />;
  }

  if (status === "processing") {
    return <Chip size="small" color="warning" label="CSV processing" />;
  }

  return <Chip size="small" color="default" label="CSV pending" />;
}

async function waitForExport(orderId: string, orderNumber: string) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    if (attempt > 0) {
      await new Promise((resolve) => window.setTimeout(resolve, 1_200));
    }

    const response = await apiClient.get<ExportResult>(`/ho/orders/${orderId}/export`);

    if (response.data.downloadUrl) {
      triggerFileDownload(response.data.downloadUrl);
      toast.success(`ERP CSV ready for ${orderNumber}.`);
      return;
    }
  }

  toast.success(`Order ${orderNumber} approved. CSV generation is still running.`);
}

export function HeadOfficeOrdersPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<OrderTab>("pending");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [discountDrafts, setDiscountDrafts] = useState<Record<string, string>>({});
  const [rejectingOrder, setRejectingOrder] = useState<Order | null>(null);
  const [rejectRemarks, setRejectRemarks] = useState("");
  const deferredSearch = useDeferredValue(searchInput);

  useEffect(() => {
    setPage(1);
  }, [deferredSearch, tab]);

  const queryState: OrderListQuery = {
    page,
    pageSize: 8,
    search: deferredSearch.trim(),
    status: tab,
  };

  const ordersQuery = useQuery({
    queryKey: queryKeys.headOfficeOrders(queryState),
    queryFn: async () => {
      const response = await apiClient.get<PaginatedOrdersResponse>("/ho/orders", {
        params: queryState,
      });
      return response.data;
    },
    placeholderData: keepPreviousData,
  });

  const approveMutation = useMutation({
    mutationFn: async ({
      orderId,
      discountPct,
    }: {
      orderId: string;
      discountPct: number;
      orderNumber: string;
    }) => {
      const response = await apiClient.post<ExportResult>(`/ho/orders/${orderId}/approve`, {
        discountPct,
      });
      return response.data;
    },
    onSuccess: (result, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["head-office-orders"] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboardSummary });

      if (result.downloadUrl) {
        triggerFileDownload(result.downloadUrl);
        toast.success("Order approved and ERP CSV is ready.");
        return;
      }

      void waitForExport(variables.orderId, variables.orderNumber).catch((error) => {
        toast.error(getApiErrorMessage(error, "CSV generation is still pending."));
      });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Approval failed."));
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ orderId, remarks }: { orderId: string; remarks?: string }) => {
      await apiClient.post(`/ho/orders/${orderId}/reject`, {
        remarks,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["head-office-orders"] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboardSummary });
      toast.success("Order rejected.");
      setRejectingOrder(null);
      setRejectRemarks("");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Rejection failed."));
    },
  });

  const reviewOrders = useMemo(() => ordersQuery.data?.items ?? [], [ordersQuery.data]);

  async function downloadExport(order: Order) {
    try {
      const response = await apiClient.get<ExportResult>(`/ho/orders/${order.id}/export`);

      if (response.data.downloadUrl) {
        triggerFileDownload(response.data.downloadUrl);
        return;
      }

      toast.success("CSV generation has started. We will keep checking for completion.");
      await waitForExport(order.id, order.orderNumber);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Unable to prepare the export."));
    }
  }

  if (ordersQuery.isPending) {
    return <LoadingPanel rows={5} />;
  }

  if (ordersQuery.isError || !ordersQuery.data) {
    return (
      <EmptyState
        title="Order queue unavailable"
        description={getApiErrorMessage(ordersQuery.error, "We could not load the queue.")}
        actionLabel="Reload"
        onAction={() => void ordersQuery.refetch()}
      />
    );
  }

  return (
    <Stack spacing={3.5}>
      <PageHeader
        eyebrow="Order Queue"
        title="Approve, reject, and export"
        description="Review each line item, control discounting at Head Office only, and generate deterministic ERP-safe CSV files."
      />

      <Paper sx={{ p: 2.5 }}>
        <Stack spacing={2}>
          <Tabs
            value={tab}
            onChange={(_event, value: OrderTab) => startTransition(() => setTab(value))}
          >
            <Tab label="Pending" value="pending" />
            <Tab label="Approved" value="approved" />
            <Tab label="Rejected" value="rejected" />
          </Tabs>
          <TextField
            fullWidth
            placeholder="Search order number, dealer, SKU code, or item name"
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
        </Stack>
      </Paper>

      {reviewOrders.length === 0 ? (
        <EmptyState
          title="Nothing to review here"
          description="The queue is empty for the current tab and search criteria."
        />
      ) : (
        <>
          <Stack spacing={3}>
            {reviewOrders.map((order) => {
              const draftValue = discountDrafts[order.id] ?? String(order.discountPct ?? "");
              const parsedDiscount = Number(draftValue);
              const previewNet =
                draftValue !== "" && Number.isFinite(parsedDiscount)
                  ? order.grossAmount * (1 - parsedDiscount / 100)
                  : order.netAmount;

              return (
                <Card key={order.id}>
                  <CardContent sx={{ p: 3 }}>
                    <Stack spacing={2.5}>
                      <Stack
                        direction={{ xs: "column", md: "row" }}
                        justifyContent="space-between"
                        spacing={1.5}
                      >
                        <Stack spacing={0.75}>
                          <Typography variant="h4">{order.orderNumber}</Typography>
                          <Typography color="text.secondary">
                            {order.dealerName} · {order.dealerCode} · {formatDateTime(order.createdAt)}
                          </Typography>
                        </Stack>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          <StatusChip status={order.status} />
                          {order.status === "approved" ? (
                            <ExportStatusBadge status={order.exportStatus} />
                          ) : null}
                        </Stack>
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
                        <Stack spacing={2}>
                          <Stack
                            direction={{ xs: "column", md: "row" }}
                            spacing={2}
                            justifyContent="space-between"
                          >
                            <Box>
                              <Typography color="text.secondary">Gross Amount</Typography>
                              <Typography mt={0.5} fontWeight={800}>
                                {formatCurrency(order.grossAmount)}
                              </Typography>
                            </Box>
                            <Box>
                              <Typography color="text.secondary">Net Preview</Typography>
                              <Typography mt={0.5} fontWeight={800}>
                                {formatCurrency(previewNet)}
                              </Typography>
                            </Box>
                          </Stack>

                          {order.status === "pending" ? (
                            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
                              <TextField
                                label="Discount %"
                                type="number"
                                value={draftValue}
                                onChange={(event) =>
                                  setDiscountDrafts((current) => ({
                                    ...current,
                                    [order.id]: event.target.value,
                                  }))
                                }
                              />
                              <Button
                                variant="contained"
                                disabled={approveMutation.isPending}
                                onClick={() => {
                                  const parsed = approveOrderSchema.safeParse({
                                    discountPct: draftValue || 0,
                                  });

                                  if (!parsed.success) {
                                    toast.error(
                                      parsed.error.issues[0]?.message ?? "Enter a valid discount.",
                                    );
                                    return;
                                  }

                                  approveMutation.mutate({
                                    orderId: order.id,
                                    discountPct: parsed.data.discountPct,
                                    orderNumber: order.orderNumber,
                                  });
                                }}
                              >
                                Approve order
                              </Button>
                              <Button
                                variant="outlined"
                                color="inherit"
                                onClick={() => setRejectingOrder(order)}
                              >
                                Reject order
                              </Button>
                            </Stack>
                          ) : order.status === "approved" ? (
                            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                              <Button
                                variant="contained"
                                startIcon={<DownloadRoundedIcon />}
                                onClick={() => void downloadExport(order)}
                              >
                                Download CSV
                              </Button>
                              <Typography color="text.secondary" alignSelf="center">
                                Export status: {order.exportStatus ?? "pending"}
                              </Typography>
                            </Stack>
                          ) : order.remarks ? (
                            <Typography color="text.secondary">{order.remarks}</Typography>
                          ) : null}
                        </Stack>
                      </Paper>
                    </Stack>
                  </CardContent>
                </Card>
              );
            })}
          </Stack>
          <PaginationBar
            page={ordersQuery.data.pagination.page}
            totalPages={ordersQuery.data.pagination.totalPages}
            totalItems={ordersQuery.data.pagination.totalItems}
            onPageChange={setPage}
          />
        </>
      )}

      <Dialog
        open={Boolean(rejectingOrder)}
        onClose={() => setRejectingOrder(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Reject order</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={0.5}>
            <Typography color="text.secondary">
              Add a reason so the dealer can understand why the order was rejected.
            </Typography>
            <TextField
              label="Remarks"
              multiline
              minRows={4}
              value={rejectRemarks}
              onChange={(event) => setRejectRemarks(event.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectingOrder(null)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            disabled={!rejectingOrder || rejectMutation.isPending}
            onClick={() => {
              if (!rejectingOrder) {
                return;
              }

              rejectMutation.mutate({
                orderId: rejectingOrder.id,
                remarks: rejectRemarks.trim() || undefined,
              });
            }}
          >
            Confirm rejection
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
