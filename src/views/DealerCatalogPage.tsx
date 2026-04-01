import AddShoppingCartRoundedIcon from "@mui/icons-material/AddShoppingCartRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import LocalShippingRoundedIcon from "@mui/icons-material/LocalShippingRounded";
import RemoveRoundedIcon from "@mui/icons-material/RemoveRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import ShoppingBagRoundedIcon from "@mui/icons-material/ShoppingBagRounded";
import TaskAltRoundedIcon from "@mui/icons-material/TaskAltRounded";
import {
  Badge,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Drawer,
  IconButton,
  InputAdornment,
  InputBase,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { memo, startTransition, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import type {
  CatalogQuery,
  CreateOrderInput,
  DealerCatalogItem,
  PaginatedCatalogResponse,
  PaginatedDealerOrdersResponse,
} from "../../shared/contracts";
import { createOrderSchema } from "../../shared/contracts";
import { apiClient, getApiErrorMessage } from "../api/client";
import { queryKeys } from "../api/query-keys";
import { useAuth } from "../auth/AuthContext";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { EmptyState } from "../ui/EmptyState";
import { LoadingPanel } from "../ui/LoadingPanel";
import { MetricCard } from "../ui/MetricCard";
import { PageHeader } from "../ui/PageHeader";
import { PaginationBar } from "../ui/PaginationBar";

const PAGE_SIZE = 48;

type CartState = Record<string, { sku: DealerCatalogItem; qty: number }>;

interface CatalogRowData {
  sku: DealerCatalogItem;
  qtyDrafts: Record<string, string>;
  onQtyChange: (skuId: string, value: string) => void;
  onQtyStep: (skuId: string, delta: number) => void;
  onAdd: (sku: DealerCatalogItem) => void;
  cartQty: number;
}

interface QuantityStepperProps {
  value: string;
  onChange: (value: string) => void;
  onDecrement: () => void;
  onIncrement: () => void;
  ariaLabel: string;
}

const QuantityStepper = memo(function QuantityStepper({
  value,
  onChange,
  onDecrement,
  onIncrement,
  ariaLabel,
}: QuantityStepperProps) {
  const hasValue = Number(value || "0") > 0;

  return (
    <Paper
      variant="outlined"
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.5,
        px: 0.75,
        py: 0.5,
        borderRadius: 999,
        minHeight: 54,
        flexGrow: 1,
      }}
    >
      <IconButton
        color="secondary"
        onClick={onDecrement}
        disabled={!hasValue}
        aria-label={`Decrease ${ariaLabel}`}
      >
        <RemoveRoundedIcon />
      </IconButton>
      <InputBase
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/[^\d]/g, ""))}
        inputProps={{
          inputMode: "numeric",
          "aria-label": ariaLabel,
          style: { textAlign: "center", fontWeight: 700 },
        }}
        placeholder="0"
        sx={{
          flexGrow: 1,
          fontSize: "1.1rem",
          minWidth: 56,
        }}
      />
      <IconButton color="secondary" onClick={onIncrement} aria-label={`Increase ${ariaLabel}`}>
        <AddRoundedIcon />
      </IconButton>
    </Paper>
  );
});

const CatalogCard = memo(function CatalogCard({
  sku,
  qtyDrafts,
  onQtyChange,
  onQtyStep,
  onAdd,
  cartQty,
}: CatalogRowData) {
  return (
    <Card sx={{ height: "100%" }}>
      <CardContent sx={{ p: 2.5 }}>
        <Stack spacing={2}>
          <Stack direction="row" justifyContent="space-between" spacing={1} useFlexGap flexWrap="wrap">
            <Chip label={sku.code} color="primary" />
            <Chip label={sku.category} variant="outlined" />
          </Stack>
          <Box>
            <Typography variant="h5">{sku.name}</Typography>
            <Typography mt={0.75} color="text.secondary">
              Unit of measure: {sku.uom}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Chip
              size="small"
              label="+5"
              variant="outlined"
              onClick={() => onQtyStep(sku.id, 5)}
            />
            <Chip
              size="small"
              label="+10"
              variant="outlined"
              onClick={() => onQtyStep(sku.id, 10)}
            />
            {cartQty > 0 ? (
              <Chip size="small" color="secondary" label={`In cart ${cartQty}`} />
            ) : null}
          </Stack>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
            <QuantityStepper
              value={qtyDrafts[sku.id] ?? ""}
              onChange={(value) => onQtyChange(sku.id, value)}
              onDecrement={() => onQtyStep(sku.id, -1)}
              onIncrement={() => onQtyStep(sku.id, 1)}
              ariaLabel={`${sku.name} quantity`}
            />
            <Button
              variant="contained"
              startIcon={<AddShoppingCartRoundedIcon />}
              onClick={() => onAdd(sku)}
            >
              Add
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
});

function buildOptimisticPayload(cart: CartState): CreateOrderInput {
  return {
    items: Object.values(cart).map((entry) => ({
      skuId: entry.sku.id,
      qty: entry.qty,
    })),
  };
}

function createSubmissionKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `order-${crypto.randomUUID()}`;
  }

  return `order-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function DealerCatalogPage() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const [searchInput, setSearchInput] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [page, setPage] = useState(1);
  const [qtyDrafts, setQtyDrafts] = useState<Record<string, string>>({});
  const [cart, setCart] = useState<CartState>({});
  const [cartOpen, setCartOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(searchInput, 250);

  const catalogQueryState: CatalogQuery = {
    page,
    pageSize: PAGE_SIZE,
    search: debouncedSearch.trim(),
    category: selectedCategory,
  };

  const catalogQuery = useQuery({
    queryKey: queryKeys.dealerCatalog(catalogQueryState),
    queryFn: async () => {
      const response = await apiClient.get<PaginatedCatalogResponse>("/dealer/catalog", {
        params: catalogQueryState,
      });
      return response.data;
    },
    placeholderData: keepPreviousData,
  });

  const recentOrdersQuery = useQuery({
    queryKey: queryKeys.dealerOrders({
      page: 1,
      pageSize: 12,
      search: "",
      status: "all",
    }),
    queryFn: async () => {
      const response = await apiClient.get<PaginatedDealerOrdersResponse>("/dealer/orders", {
        params: {
          page: 1,
          pageSize: 12,
          search: "",
          status: "all",
        },
      });
      return response.data;
    },
  });

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, selectedCategory]);

  const cartItems = useMemo(() => Object.values(cart), [cart]);
  const cartQty = useMemo(
    () => cartItems.reduce((total, entry) => total + entry.qty, 0),
    [cartItems],
  );
  const pendingOrders = useMemo(
    () =>
      (recentOrdersQuery.data?.items ?? []).filter((order) => order.status === "pending").length,
    [recentOrdersQuery.data],
  );
  const approvedOrders = useMemo(
    () =>
      (recentOrdersQuery.data?.items ?? []).filter((order) => order.status === "approved")
        .length,
    [recentOrdersQuery.data],
  );

  const submitOrderMutation = useMutation({
    mutationFn: async (variables: { payload: CreateOrderInput; idempotencyKey: string }) => {
      const response = await apiClient.post("/dealer/orders", variables.payload, {
        headers: {
          "x-idempotency-key": variables.idempotencyKey,
        },
      });
      return response.data;
    },
    onMutate: async () => {
      const previousCart = cart;
      setCart({});
      setCartOpen(false);
      return { previousCart };
    },
    onError: (error, _payload, context) => {
      setCart(context?.previousCart ?? {});
      toast.error(getApiErrorMessage(error, "Unable to submit the order."));
    },
    onSuccess: (order) => {
      toast.success(`Order ${order.orderNumber} submitted successfully.`);
      void queryClient.invalidateQueries({ queryKey: ["dealer-orders"] });
    },
  });

  const renderedItems = catalogQuery.data?.items ?? [];

  function updateQtyDraft(skuId: string, value: string) {
    setQtyDrafts((current) => ({ ...current, [skuId]: value }));
  }

  function stepQtyDraft(skuId: string, delta: number) {
    setQtyDrafts((current) => {
      const nextQty = Math.max(0, Number(current[skuId] ?? "0") + delta);
      return {
        ...current,
        [skuId]: nextQty > 0 ? String(nextQty) : "",
      };
    });
  }

  function handleAddToCart(sku: DealerCatalogItem) {
    const qty = Number(qtyDrafts[sku.id] ?? "0");

    if (!qty || qty <= 0) {
      toast.error("Enter a quantity before adding the item.");
      return;
    }

    setCart((current) => ({
      ...current,
      [sku.id]: {
        sku,
        qty: (current[sku.id]?.qty ?? 0) + qty,
      },
    }));
    setQtyDrafts((current) => ({ ...current, [sku.id]: "" }));
    setCartOpen(true);
  }

  function updateCartQty(skuId: string, value: string) {
    const qty = Number(value || "0");

    setCart((current) => {
      if (!qty) {
        const next = { ...current };
        delete next[skuId];
        return next;
      }

      const existing = current[skuId];
      if (!existing) {
        return current;
      }

      return {
        ...current,
        [skuId]: {
          ...existing,
          qty,
        },
      };
    });
  }

  function stepCartQty(skuId: string, delta: number) {
    setCart((current) => {
      const existing = current[skuId];
      if (!existing) {
        return current;
      }

      const nextQty = existing.qty + delta;
      if (nextQty <= 0) {
        const next = { ...current };
        delete next[skuId];
        return next;
      }

      return {
        ...current,
        [skuId]: {
          ...existing,
          qty: nextQty,
        },
      };
    });
  }

  function handleSubmitOrder() {
    const payload = buildOptimisticPayload(cart);
    const parsed = createOrderSchema.safeParse(payload);

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Add at least one line item.");
      return;
    }

    submitOrderMutation.mutate({
      payload: parsed.data,
      idempotencyKey: createSubmissionKey(),
    });
  }

  return (
    <Stack spacing={3.5}>
      <PageHeader
        eyebrow="Dealer Catalogue"
        title={`Order faster, ${session?.displayName ?? "dealer"}`}
        description="Search the live SKU list, build the cart, and send orders without exposing rates or approval-only data."
        actions={
          <Button
            variant="contained"
            startIcon={<ShoppingBagRoundedIcon />}
            onClick={() => setCartOpen(true)}
          >
            Cart ({cartQty})
          </Button>
        }
      />

      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: {
            xs: "1fr",
            md: "repeat(3, minmax(0, 1fr))",
          },
        }}
      >
        <MetricCard
          label="Visible SKUs"
          value={`${catalogQuery.data?.pagination.totalItems ?? 0}`}
          icon={LocalShippingRoundedIcon}
        />
        <MetricCard
          label="Pending Orders"
          value={`${pendingOrders}`}
          icon={TaskAltRoundedIcon}
        />
        <MetricCard
          label="Approved Recently"
          value={`${approvedOrders}`}
          icon={ShoppingBagRoundedIcon}
        />
      </Box>

      <Paper sx={{ p: 2.5 }}>
        <Stack spacing={2}>
          <TextField
            fullWidth
            placeholder="Search item code or name"
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
            <Chip
              label="All categories"
              color={selectedCategory === "all" ? "secondary" : "default"}
              variant={selectedCategory === "all" ? "filled" : "outlined"}
              onClick={() => startTransition(() => setSelectedCategory("all"))}
            />
            {(catalogQuery.data?.categories ?? []).map((category) => (
              <Chip
                key={category}
                label={category}
                color={selectedCategory === category ? "secondary" : "default"}
                variant={selectedCategory === category ? "filled" : "outlined"}
                onClick={() => startTransition(() => setSelectedCategory(category))}
              />
            ))}
          </Stack>
        </Stack>
      </Paper>

      {catalogQuery.isPending ? (
        <LoadingPanel rows={5} />
      ) : catalogQuery.isError || !catalogQuery.data ? (
        <EmptyState
          title="Catalogue unavailable"
          description={getApiErrorMessage(
            catalogQuery.error,
            "We could not load the live SKU catalogue right now.",
          )}
        />
      ) : renderedItems.length === 0 ? (
        <EmptyState
          title="No catalogue items found"
          description="Try another category or search term to find the required SKU."
        />
      ) : (
        <>
          <Paper sx={{ p: 2 }}>
            <Box
              sx={{
                display: "grid",
                gap: 2,
                gridTemplateColumns: {
                  xs: "1fr",
                  xl: "repeat(2, minmax(0, 1fr))",
                },
              }}
            >
              {renderedItems.map((sku) => (
                <CatalogCard
                  key={sku.id}
                  sku={sku}
                  qtyDrafts={qtyDrafts}
                  onQtyChange={updateQtyDraft}
                  onQtyStep={stepQtyDraft}
                  onAdd={handleAddToCart}
                  cartQty={cart[sku.id]?.qty ?? 0}
                />
              ))}
            </Box>
          </Paper>
          <PaginationBar
            page={catalogQuery.data.pagination.page}
            totalPages={catalogQuery.data.pagination.totalPages}
            totalItems={catalogQuery.data.pagination.totalItems}
            onPageChange={setPage}
          />
        </>
      )}

      <Drawer
        anchor="right"
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        PaperProps={{
          sx: {
            width: { xs: "100%", sm: 420 },
            p: 3,
          },
        }}
      >
        <Stack spacing={2.5} height="100%">
          <Stack direction="row" justifyContent="space-between" spacing={2}>
            <Box>
              <Typography variant="h4">Order cart</Typography>
              <Typography color="text.secondary">
                Review quantities before you submit.
              </Typography>
            </Box>
            <Badge badgeContent={cartQty} color="secondary">
              <ShoppingBagRoundedIcon />
            </Badge>
          </Stack>

          <Divider />

          {cartItems.length === 0 ? (
            <EmptyState
              title="Your cart is empty"
              description="Add a few SKUs from the catalogue to prepare an order."
            />
          ) : (
            <Stack spacing={1.5} flexGrow={1} sx={{ overflowY: "auto" }}>
              {cartItems.map((entry) => (
                <Paper key={entry.sku.id} variant="outlined" sx={{ p: 2 }}>
                  <Stack spacing={1.25}>
                    <Box>
                      <Typography fontWeight={800}>{entry.sku.name}</Typography>
                      <Typography color="text.secondary">
                        {entry.sku.code} · {entry.sku.uom}
                      </Typography>
                    </Box>
                    <QuantityStepper
                      value={String(entry.qty)}
                      onChange={(value) => updateCartQty(entry.sku.id, value)}
                      onDecrement={() => stepCartQty(entry.sku.id, -1)}
                      onIncrement={() => stepCartQty(entry.sku.id, 1)}
                      ariaLabel={`${entry.sku.name} cart quantity`}
                    />
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}

          <Divider />

          <Stack spacing={1.25}>
            <Typography color="text.secondary">
              {cartItems.length} line items · {cartQty} total quantity
            </Typography>
            <Button
              size="large"
              variant="contained"
              disabled={cartItems.length === 0 || submitOrderMutation.isPending}
              onClick={handleSubmitOrder}
            >
              {submitOrderMutation.isPending ? "Submitting order..." : "Submit order"}
            </Button>
            <Button variant="outlined" color="inherit" onClick={() => setCartOpen(false)}>
              Continue browsing
            </Button>
          </Stack>
        </Stack>
      </Drawer>
    </Stack>
  );
}
