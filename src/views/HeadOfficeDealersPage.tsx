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
import { startTransition, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";

import type { Dealer, PaginatedDealersResponse, UpsertDealerInput } from "../../shared/contracts";
import { upsertDealerSchema } from "../../shared/contracts";
import { apiClient, getApiErrorMessage } from "../api/client";
import { queryKeys } from "../api/query-keys";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { EmptyState } from "../ui/EmptyState";
import { LoadingPanel } from "../ui/LoadingPanel";
import { PageHeader } from "../ui/PageHeader";
import { PaginationBar } from "../ui/PaginationBar";

const emptyDealerForm: UpsertDealerInput = {
  code: "",
  name: "",
  region: "",
  contactPerson: "",
  phone: "",
  email: "",
  active: true,
  password: "",
};

export function HeadOfficeDealersPage() {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDealer, setEditingDealer] = useState<Dealer | null>(null);
  const debouncedSearch = useDebouncedValue(searchInput, 250);

  const form = useForm<UpsertDealerInput>({
    resolver: zodResolver(upsertDealerSchema),
    defaultValues: emptyDealerForm,
  });

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const dealersQuery = useQuery({
    queryKey: queryKeys.dealers({
      page,
      pageSize: 10,
      search: debouncedSearch.trim(),
    }),
    queryFn: async () => {
      const response = await apiClient.get<PaginatedDealersResponse>("/ho/dealers", {
        params: {
          page,
          pageSize: 10,
          search: debouncedSearch.trim(),
        },
      });
      return response.data;
    },
    placeholderData: keepPreviousData,
  });

  const saveDealerMutation = useMutation({
    mutationFn: async (values: UpsertDealerInput) => {
      if (editingDealer) {
        await apiClient.put(`/ho/dealers/${editingDealer.id}`, values);
        return "Dealer updated.";
      }

      await apiClient.post("/ho/dealers", values);
      return "Dealer created.";
    },
    onSuccess: (message) => {
      toast.success(message);
      setDialogOpen(false);
      setEditingDealer(null);
      form.reset(emptyDealerForm);
      void queryClient.invalidateQueries({ queryKey: ["dealers"] });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Unable to save dealer."));
    },
  });

  function openCreateDialog() {
    setEditingDealer(null);
    form.reset(emptyDealerForm);
    setDialogOpen(true);
  }

  function openEditDialog(dealer: Dealer) {
    setEditingDealer(dealer);
    form.reset({
      code: dealer.code,
      name: dealer.name,
      region: dealer.region,
      contactPerson: dealer.contactPerson,
      phone: dealer.phone,
      email: dealer.email ?? "",
      active: dealer.active,
      password: "",
    });
    setDialogOpen(true);
  }

  if (dealersQuery.isPending) {
    return <LoadingPanel rows={5} />;
  }

  if (dealersQuery.isError || !dealersQuery.data) {
    return (
      <EmptyState
        title="Dealer master unavailable"
        description={getApiErrorMessage(dealersQuery.error, "We could not load dealer records.")}
        actionLabel="Reload"
        onAction={() => void dealersQuery.refetch()}
      />
    );
  }

  return (
    <Stack spacing={3.5}>
      <PageHeader
        eyebrow="Dealer Master"
        title="Manage dealer access"
        description="Create, update, or deactivate dealer accounts and control the credentials used in the dealer portal."
        actions={
          <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreateDialog}>
            Add dealer
          </Button>
        }
      />

      <Paper sx={{ p: 2.5 }}>
        <TextField
          fullWidth
          placeholder="Search dealer code, name, region, or contact person"
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

      {dealersQuery.data.items.length === 0 ? (
        <EmptyState
          title="No dealer records found"
          description="Adjust the search or create a new dealer account."
          actionLabel="Add dealer"
          onAction={openCreateDialog}
        />
      ) : (
        <>
          <Paper sx={{ overflow: "hidden" }}>
            <TableContainer sx={{ overflowX: "auto" }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Dealer</TableCell>
                    <TableCell>Region</TableCell>
                    <TableCell>Contact</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dealersQuery.data.items.map((dealer) => (
                    <TableRow key={dealer.id} hover>
                      <TableCell>
                        <Stack spacing={0.5}>
                          <Typography fontWeight={800}>{dealer.name}</Typography>
                          <Typography color="text.secondary">{dealer.code}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>{dealer.region}</TableCell>
                      <TableCell>
                        <Stack spacing={0.5}>
                          <Typography>{dealer.contactPerson}</Typography>
                          <Typography color="text.secondary">{dealer.phone}</Typography>
                          <Typography color="text.secondary">{dealer.email || "No email"}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={dealer.active ? "Active" : "Inactive"}
                          color={dealer.active ? "success" : "default"}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          startIcon={<EditRoundedIcon />}
                          onClick={() => openEditDialog(dealer)}
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
            page={dealersQuery.data.pagination.page}
            totalPages={dealersQuery.data.pagination.totalPages}
            totalItems={dealersQuery.data.pagination.totalItems}
            onPageChange={setPage}
          />
        </>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{editingDealer ? "Edit dealer" : "Create dealer"}</DialogTitle>
        <DialogContent>
          <Stack
            component="form"
            spacing={2}
            mt={0.5}
            onSubmit={form.handleSubmit((values) => saveDealerMutation.mutate(values))}
          >
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Dealer code"
                  {...form.register("code")}
                  error={Boolean(form.formState.errors.code)}
                  helperText={form.formState.errors.code?.message}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Dealer name"
                  {...form.register("name")}
                  error={Boolean(form.formState.errors.name)}
                  helperText={form.formState.errors.name?.message}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Region"
                  {...form.register("region")}
                  error={Boolean(form.formState.errors.region)}
                  helperText={form.formState.errors.region?.message}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Contact person"
                  {...form.register("contactPerson")}
                  error={Boolean(form.formState.errors.contactPerson)}
                  helperText={form.formState.errors.contactPerson?.message}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Phone"
                  {...form.register("phone")}
                  error={Boolean(form.formState.errors.phone)}
                  helperText={form.formState.errors.phone?.message}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Email"
                  {...form.register("email")}
                  error={Boolean(form.formState.errors.email)}
                  helperText={form.formState.errors.email?.message}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  type="password"
                  label={editingDealer ? "Admin-set password (optional)" : "Initial password"}
                  {...form.register("password")}
                  error={Boolean(form.formState.errors.password)}
                  helperText={
                    form.formState.errors.password?.message ??
                    (editingDealer
                      ? "Leave blank to keep the current password."
                      : "Admin sets the initial password for the dealer user.")
                  }
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
              label="Dealer account active"
            />
            <DialogActions sx={{ px: 0 }}>
              <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={saveDealerMutation.isPending}>
                {editingDealer ? "Save changes" : "Create dealer"}
              </Button>
            </DialogActions>
          </Stack>
        </DialogContent>
      </Dialog>
    </Stack>
  );
}
