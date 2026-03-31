import AddRoundedIcon from "@mui/icons-material/AddRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  InputAdornment,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { startTransition, useDeferredValue, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";

import type { PaginatedSkusResponse, Sku, UpsertSkuInput } from "../../shared/contracts";
import { upsertSkuSchema } from "../../shared/contracts";
import { apiClient, getApiErrorMessage } from "../api/client";
import { queryKeys } from "../api/query-keys";
import { formatCurrency } from "../lib/format";
import { EmptyState } from "../ui/EmptyState";
import { LoadingPanel } from "../ui/LoadingPanel";
import { PageHeader } from "../ui/PageHeader";
import { PaginationBar } from "../ui/PaginationBar";

const emptySkuForm: UpsertSkuInput = {
  code: "",
  name: "",
  category: "",
  uom: "PCS",
  rate: 0,
  active: true,
};

export function HeadOfficeSkusPage() {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSku, setEditingSku] = useState<Sku | null>(null);
  const deferredSearch = useDeferredValue(searchInput);

  const form = useForm<UpsertSkuInput>({
    resolver: zodResolver(upsertSkuSchema),
    defaultValues: emptySkuForm,
  });

  useEffect(() => {
    setPage(1);
  }, [deferredSearch]);

  const skusQuery = useQuery({
    queryKey: queryKeys.skus({
      page,
      pageSize: 10,
      search: deferredSearch.trim(),
    }),
    queryFn: async () => {
      const response = await apiClient.get<PaginatedSkusResponse>("/ho/skus", {
        params: {
          page,
          pageSize: 10,
          search: deferredSearch.trim(),
        },
      });
      return response.data;
    },
    placeholderData: keepPreviousData,
  });

  const saveSkuMutation = useMutation({
    mutationFn: async (values: UpsertSkuInput) => {
      if (editingSku) {
        await apiClient.put(`/ho/skus/${editingSku.id}`, values);
        return "SKU updated.";
      }

      await apiClient.post("/ho/skus", values);
      return "SKU created.";
    },
    onSuccess: (message) => {
      toast.success(message);
      setDialogOpen(false);
      setEditingSku(null);
      form.reset(emptySkuForm);
      void queryClient.invalidateQueries({ queryKey: ["skus"] });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Unable to save SKU."));
    },
  });

  function openCreateDialog() {
    setEditingSku(null);
    form.reset(emptySkuForm);
    setDialogOpen(true);
  }

  function openEditDialog(sku: Sku) {
    setEditingSku(sku);
    form.reset({
      code: sku.code,
      name: sku.name,
      category: sku.category,
      uom: sku.uom,
      rate: sku.rate,
      active: sku.active,
    });
    setDialogOpen(true);
  }

  if (skusQuery.isPending) {
    return <LoadingPanel rows={5} />;
  }

  if (skusQuery.isError || !skusQuery.data) {
    return (
      <EmptyState
        title="SKU master unavailable"
        description={getApiErrorMessage(skusQuery.error, "We could not load SKU records.")}
        actionLabel="Reload"
        onAction={() => void skusQuery.refetch()}
      />
    );
  }

  return (
    <Stack spacing={3.5}>
      <PageHeader
        eyebrow="SKU Master"
        title="Maintain the product catalogue"
        description="Update product names, item codes, categories, units, rates, and active availability from one controlled master."
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
      </Paper>

      {skusQuery.data.items.length === 0 ? (
        <EmptyState
          title="No SKU records found"
          description="Adjust the search or create a new SKU entry."
          actionLabel="Add SKU"
          onAction={openCreateDialog}
        />
      ) : (
        <>
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
                  {skusQuery.data.items.map((sku) => (
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
          <PaginationBar
            page={skusQuery.data.pagination.page}
            totalPages={skusQuery.data.pagination.totalPages}
            totalItems={skusQuery.data.pagination.totalItems}
            onPageChange={setPage}
          />
        </>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{editingSku ? "Edit SKU" : "Create SKU"}</DialogTitle>
        <DialogContent>
          <Stack
            component="form"
            spacing={2}
            mt={0.5}
            onSubmit={form.handleSubmit((values) => saveSkuMutation.mutate(values))}
          >
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Item code"
                  {...form.register("code")}
                  error={Boolean(form.formState.errors.code)}
                  helperText={form.formState.errors.code?.message}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Item name"
                  {...form.register("name")}
                  error={Boolean(form.formState.errors.name)}
                  helperText={form.formState.errors.name?.message}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  label="Category"
                  {...form.register("category")}
                  error={Boolean(form.formState.errors.category)}
                  helperText={form.formState.errors.category?.message}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  label="UOM"
                  {...form.register("uom")}
                  error={Boolean(form.formState.errors.uom)}
                  helperText={form.formState.errors.uom?.message}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Rate"
                  {...form.register("rate", { valueAsNumber: true })}
                  error={Boolean(form.formState.errors.rate)}
                  helperText={form.formState.errors.rate?.message}
                />
              </Grid>
            </Grid>
            <FormControlLabel
              control={
                <Switch
                  checked={form.watch("active")}
                  onChange={(_event, checked) => form.setValue("active", checked)}
                />
              }
              label="SKU active"
            />
            <DialogActions sx={{ px: 0 }}>
              <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={saveSkuMutation.isPending}>
                {editingSku ? "Save changes" : "Create SKU"}
              </Button>
            </DialogActions>
          </Stack>
        </DialogContent>
      </Dialog>
    </Stack>
  );
}
