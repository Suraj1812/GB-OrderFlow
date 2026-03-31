import AddRoundedIcon from "@mui/icons-material/AddRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import {
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  InputAdornment,
  Paper,
  Stack,
  Switch,
  Table,
  TableContainer,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import axios from "axios";
import { startTransition, useDeferredValue, useMemo, useState } from "react";
import toast from "react-hot-toast";

import type { Sku, UpsertSkuInput } from "../../shared/contracts";
import { upsertSkuSchema } from "../../shared/contracts";
import { apiClient } from "../api/client";
import { useApiQuery } from "../hooks/useApiQuery";
import { formatCurrency } from "../lib/format";
import { EmptyState } from "../ui/EmptyState";
import { PageHeader } from "../ui/PageHeader";

type SkuFormState = UpsertSkuInput;

const emptySkuForm: SkuFormState = {
  code: "",
  name: "",
  category: "",
  uom: "PCS",
  rate: 0,
  active: true,
};

export function HeadOfficeSkusPage() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSku, setEditingSku] = useState<Sku | null>(null);
  const [form, setForm] = useState<SkuFormState>(emptySkuForm);
  const deferredSearch = useDeferredValue(search);

  const skusQuery = useApiQuery(
    async (signal) => {
      const response = await apiClient.get<Sku[]>("/ho/skus", { signal });
      return response.data;
    },
    [],
  );

  const skus = skusQuery.data ?? [];

  const filteredSkus = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();

    return skus.filter((sku) => {
      if (!query) {
        return true;
      }

      return (
        sku.code.toLowerCase().includes(query) ||
        sku.name.toLowerCase().includes(query) ||
        sku.category.toLowerCase().includes(query)
      );
    });
  }, [deferredSearch, skus]);

  function openCreateDialog() {
    setEditingSku(null);
    setForm(emptySkuForm);
    setDialogOpen(true);
  }

  function openEditDialog(sku: Sku) {
    setEditingSku(sku);
    setForm({
      code: sku.code,
      name: sku.name,
      category: sku.category,
      uom: sku.uom,
      rate: sku.rate,
      active: sku.active,
    });
    setDialogOpen(true);
  }

  async function saveSku() {
    const parsed = upsertSkuSchema.safeParse(form);

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Enter a valid SKU.");
      return;
    }

    try {
      if (editingSku) {
        await apiClient.put(`/ho/skus/${editingSku.id}`, parsed.data);
        toast.success("SKU updated.");
      } else {
        await apiClient.post("/ho/skus", parsed.data);
        toast.success("SKU created.");
      }

      setDialogOpen(false);
      setEditingSku(null);
      setForm(emptySkuForm);
      skusQuery.refresh();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message ?? "Unable to save SKU.");
      } else {
        toast.error("Unable to save SKU.");
      }
    }
  }

  if (skusQuery.loading) {
    return <Typography color="text.secondary">Loading SKUs...</Typography>;
  }

  if (!skusQuery.data) {
    return (
      <EmptyState
        title="SKU master unavailable"
        description={skusQuery.error ?? "We could not load SKU records."}
        actionLabel="Reload"
        onAction={skusQuery.refresh}
      />
    );
  }

  return (
    <Stack spacing={3.5}>
      <PageHeader
        eyebrow="SKU Master"
        title="Maintain the product catalogue"
        description="Update product names, item codes, categories, rates, units of measure, and active availability from one central master."
        actions={
          <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreateDialog}>
            Add SKU
          </Button>
        }
      />

      <Paper sx={{ p: 2.5 }}>
        <TextField
          fullWidth
          placeholder="Search item code, name, or category"
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
      </Paper>

      {filteredSkus.length === 0 ? (
        <EmptyState
          title="No SKU records found"
          description="Adjust your search or create a new SKU entry."
          actionLabel="Add SKU"
          onAction={openCreateDialog}
        />
      ) : (
        <Paper sx={{ overflow: "hidden" }}>
          <TableContainer sx={{ overflowX: "auto" }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>SKU</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>UOM</TableCell>
                <TableCell>Rate</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredSkus.map((sku) => (
                <TableRow key={sku.id} hover>
                  <TableCell>
                    <Stack spacing={0.5}>
                      <Typography fontWeight={800}>{sku.name}</Typography>
                      <Typography color="text.secondary">{sku.code}</Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>{sku.category}</TableCell>
                  <TableCell>{sku.uom}</TableCell>
                  <TableCell>{formatCurrency(sku.rate)}</TableCell>
                  <TableCell>
                    <Chip
                      label={sku.active ? "Active" : "Inactive"}
                      color={sku.active ? "success" : "default"}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      startIcon={<EditRoundedIcon />}
                      onClick={() => openEditDialog(sku)}
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </TableContainer>
        </Paper>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{editingSku ? "Edit SKU" : "Create SKU"}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} mt={0.5}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Item code"
                value={form.code}
                onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Item name"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label="Category"
                value={form.category}
                onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label="UOM"
                value={form.uom}
                onChange={(event) => setForm((current) => ({ ...current, uom: event.target.value }))}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label="Rate"
                type="number"
                value={form.rate}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    rate: Number(event.target.value),
                  }))
                }
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Paper sx={{ p: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography fontWeight={700}>SKU active</Typography>
                  <Switch
                    checked={form.active}
                    onChange={(_event, checked) =>
                      setForm((current) => ({ ...current, active: checked }))
                    }
                  />
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button color="inherit" onClick={() => setDialogOpen(false)}>
            Cancel
          </Button>
          <Button variant="contained" onClick={saveSku}>
            Save SKU
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
