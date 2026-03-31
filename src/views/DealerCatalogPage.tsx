import AddShoppingCartRoundedIcon from "@mui/icons-material/AddShoppingCartRounded";
import LocalShippingRoundedIcon from "@mui/icons-material/LocalShippingRounded";
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
  Grid,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  memo,
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import toast from "react-hot-toast";

import type {
  DealerCatalogItem,
  DealerCatalogResponse,
  DealerOrderView,
} from "../../shared/contracts";
import { createOrderSchema } from "../../shared/contracts";
import { apiClient } from "../api/client";
import { useApiQuery } from "../hooks/useApiQuery";
import { EmptyState } from "../ui/EmptyState";
import { MetricCard } from "../ui/MetricCard";
import { PageHeader } from "../ui/PageHeader";

const PAGE_SIZE = 24;

const CatalogCard = memo(function CatalogCard({
  sku,
  qtyDraft,
  onQtyChange,
  onAdd,
}: {
  sku: DealerCatalogItem;
  qtyDraft: string;
  onQtyChange: (skuId: string, value: string) => void;
  onAdd: (sku: DealerCatalogItem) => void;
}) {
  return (
    <Card sx={{ height: "100%" }}>
      <CardContent sx={{ p: 3 }}>
        <Stack spacing={2.25}>
          <Stack direction="row" justifyContent="space-between" spacing={1}>
            <Chip label={sku.code} color="primary" />
            <Chip label={sku.category} variant="outlined" />
          </Stack>
          <Box>
            <Typography variant="h5">{sku.name}</Typography>
            <Typography mt={0.75} color="text.secondary">
              Unit of measure: {sku.uom}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1.25}>
            <TextField
              fullWidth
              size="small"
              value={qtyDraft}
              label="Qty"
              inputMode="numeric"
              onChange={(event) =>
                onQtyChange(sku.id, event.target.value.replace(/[^\d]/g, ""))
              }
            />
            <Button
              variant="contained"
              color="primary"
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

export function DealerCatalogPage() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [qtyDrafts, setQtyDrafts] = useState<Record<string, string>>({});
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const deferredSearch = useDeferredValue(search);

  const catalogQuery = useApiQuery(
    async (signal) => {
      const response = await apiClient.get<DealerCatalogResponse>("/dealer/catalog", {
        signal,
      });
      return response.data;
    },
    [],
  );

  const ordersQuery = useApiQuery(
    async (signal) => {
      const response = await apiClient.get<DealerOrderView[]>("/dealer/orders", {
        signal,
      });
      return response.data;
    },
    [],
  );

  const catalog = catalogQuery.data;
  const orders = ordersQuery.data ?? [];
  const catalogById = useMemo(
    () => new Map(catalog?.items.map((item) => [item.id, item]) ?? []),
    [catalog],
  );

  const filteredItems = useMemo(() => {
    if (!catalog) {
      return [];
    }

    const query = deferredSearch.trim().toLowerCase();

    return catalog.items.filter((item) => {
      const matchesCategory =
        selectedCategory === "All" || item.category === selectedCategory;
      const matchesSearch =
        query.length === 0 ||
        item.name.toLowerCase().includes(query) ||
        item.code.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [catalog, deferredSearch, selectedCategory]);

  const visibleItems = useMemo(
    () => filteredItems.slice(0, visibleCount),
    [filteredItems, visibleCount],
  );

  const cartItems = useMemo(() => {
    if (!catalog) {
      return [];
    }

    return Object.entries(cart)
      .map(([skuId, qty]) => {
        const sku = catalogById.get(skuId);
        if (!sku) {
          return null;
        }

        return {
          sku,
          qty,
        };
      })
      .filter(Boolean) as Array<{ sku: DealerCatalogItem; qty: number }>;
  }, [cart, catalog, catalogById]);

  const cartTotalQty = useMemo(
    () => cartItems.reduce((total, item) => total + item.qty, 0),
    [cartItems],
  );

  const pendingOrders = orders.filter((order) => order.status === "pending").length;
  const approvedOrders = orders.filter((order) => order.status === "approved").length;

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [deferredSearch, selectedCategory]);

  const handleAddToCart = useCallback((sku: DealerCatalogItem) => {
    const qty = Number(qtyDrafts[sku.id] || 0);

    if (!qty || qty <= 0) {
      toast.error("Enter a quantity before adding the item.");
      return;
    }

    setCart((current) => ({
      ...current,
      [sku.id]: (current[sku.id] ?? 0) + qty,
    }));
    setQtyDrafts((current) => ({ ...current, [sku.id]: "" }));
    setCartOpen(true);
    toast.success(`${sku.code} added to cart.`);
  }, [qtyDrafts]);

  const updateCartQty = useCallback((skuId: string, nextValue: string) => {
    const qty = Number(nextValue || 0);

    setCart((current) => {
      if (!qty) {
        const { [skuId]: _removed, ...rest } = current;
        return rest;
      }

      return {
        ...current,
        [skuId]: qty,
      };
    });
  }, []);

  const updateQtyDraft = useCallback((skuId: string, value: string) => {
    setQtyDrafts((current) => {
      if (current[skuId] === value) {
        return current;
      }

      return { ...current, [skuId]: value };
    });
  }, []);

  async function handleSubmitOrder() {
    const payload = {
      items: cartItems.map((item) => ({
        skuId: item.sku.id,
        qty: item.qty,
      })),
    };

    const parsed = createOrderSchema.safeParse(payload);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Add at least one item.");
      return;
    }

    setSubmittingOrder(true);

    try {
      const response = await apiClient.post<DealerOrderView>("/dealer/orders", parsed.data);
      toast.success(`Order ${response.data.orderNumber} submitted successfully.`);
      setCart({});
      setCartOpen(false);
      ordersQuery.refresh();
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Unable to submit the order.");
      }
    } finally {
      setSubmittingOrder(false);
    }
  }

  if (catalogQuery.loading || ordersQuery.loading) {
    return <Typography color="text.secondary">Loading catalogue...</Typography>;
  }

  if (!catalog) {
    return (
      <EmptyState
        title="Catalogue unavailable"
        description={catalogQuery.error ?? "We could not load the SKU catalogue right now."}
        actionLabel="Reload"
        onAction={() => {
          catalogQuery.refresh();
          ordersQuery.refresh();
        }}
      />
    );
  }

  return (
    <Stack spacing={3.5}>
      <PageHeader
        eyebrow="Dealer Workspace"
        title="Order from the live SKU catalogue"
        description="Search by item name or SKU code, add quantities to your cart, and submit the order to Head Office for approval. Pricing and discount data remain hidden on purpose."
        actions={
          <Button
            variant="contained"
            startIcon={
              <Badge badgeContent={cartItems.length} color="secondary">
                <ShoppingBagRoundedIcon />
              </Badge>
            }
            onClick={() => setCartOpen(true)}
          >
            Open cart
          </Button>
        }
      />

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <MetricCard
            label="Catalogue"
            value={`${catalog.items.length}`}
            helper="Active SKU lines available to order"
            icon={LocalShippingRoundedIcon}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <MetricCard
            label="Pending"
            value={`${pendingOrders}`}
            helper="Orders currently waiting for Head Office approval"
            icon={ShoppingBagRoundedIcon}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <MetricCard
            label="Approved"
            value={`${approvedOrders}`}
            helper="Orders approved and ready for fulfilment"
            icon={TaskAltRoundedIcon}
          />
        </Grid>
      </Grid>

      <Paper sx={{ p: 2.5 }}>
        <Stack spacing={2}>
          <TextField
            fullWidth
            placeholder="Search SKU code or product name"
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
            {["All", ...catalog.categories].map((category) => (
              <Chip
                key={category}
                label={category}
                color={selectedCategory === category ? "secondary" : "default"}
                variant={selectedCategory === category ? "filled" : "outlined"}
                onClick={() => startTransition(() => setSelectedCategory(category))}
              />
            ))}
          </Stack>
          <Typography color="text.secondary" variant="body2">
            Showing {Math.min(visibleItems.length, filteredItems.length)} of{" "}
            {filteredItems.length} matching SKU lines
          </Typography>
        </Stack>
      </Paper>

      {filteredItems.length === 0 ? (
        <EmptyState
          title="No SKU lines matched"
          description="Try a different keyword or clear the category filter to see more items."
          actionLabel="Reset filters"
          onAction={() => {
            setSearch("");
            setSelectedCategory("All");
          }}
        />
      ) : (
        <>
          <Grid container spacing={3}>
            {visibleItems.map((sku) => (
              <Grid key={sku.id} size={{ xs: 12, sm: 6, xl: 4 }} className="lazy-section">
              <CatalogCard
                sku={sku}
                qtyDraft={qtyDrafts[sku.id] ?? ""}
                onQtyChange={updateQtyDraft}
                onAdd={handleAddToCart}
              />
            </Grid>
            ))}
          </Grid>
          {visibleItems.length < filteredItems.length ? (
            <Stack alignItems="center">
              <Button
                variant="outlined"
                color="inherit"
                onClick={() =>
                  setVisibleCount((current) =>
                    Math.min(current + PAGE_SIZE, filteredItems.length),
                  )
                }
              >
                Load more items
              </Button>
            </Stack>
          ) : null}
        </>
      )}

      <Drawer anchor="right" open={cartOpen} onClose={() => setCartOpen(false)}>
        <Box sx={{ width: { xs: "100vw", sm: 460 }, p: 3 }}>
          <Stack spacing={2.5}>
            <Box>
              <Typography variant="h4">Current cart</Typography>
              <Typography mt={0.75} color="text.secondary">
                Dealers only submit quantities. Head Office applies discounts later.
              </Typography>
            </Box>
            {cartItems.length === 0 ? (
              <EmptyState
                title="Your cart is empty"
                description="Add one or more SKU lines from the catalogue to submit a new order."
              />
            ) : (
              <>
                <List disablePadding>
                  {cartItems.map((item, index) => (
                    <Box key={item.sku.id}>
                      <ListItem disableGutters sx={{ py: 1.5 }}>
                        <ListItemText
                          primary={`${item.sku.code} · ${item.sku.name}`}
                          secondary={`${item.sku.category} · ${item.sku.uom}`}
                        />
                        <TextField
                          size="small"
                          sx={{ width: 100 }}
                          value={String(item.qty)}
                          label="Qty"
                          inputMode="numeric"
                          onChange={(event) =>
                            updateCartQty(
                              item.sku.id,
                              event.target.value.replace(/[^\d]/g, ""),
                            )
                          }
                        />
                      </ListItem>
                      {index < cartItems.length - 1 ? <Divider /> : null}
                    </Box>
                  ))}
                </List>
                <Paper sx={{ p: 2.5, bgcolor: "rgba(26,26,46,0.03)" }}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography color="text.secondary">Line items</Typography>
                    <Typography fontWeight={800}>{cartItems.length}</Typography>
                  </Stack>
                  <Stack mt={1} direction="row" justifyContent="space-between">
                    <Typography color="text.secondary">Total quantity</Typography>
                    <Typography fontWeight={800}>{cartTotalQty}</Typography>
                  </Stack>
                </Paper>
                <Stack direction="row" spacing={1.5}>
                  <Button
                    fullWidth
                    color="inherit"
                    variant="outlined"
                    onClick={() => setCart({})}
                  >
                    Clear
                  </Button>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={handleSubmitOrder}
                    disabled={submittingOrder}
                  >
                    Submit order
                  </Button>
                </Stack>
              </>
            )}
          </Stack>
        </Box>
      </Drawer>
    </Stack>
  );
}
