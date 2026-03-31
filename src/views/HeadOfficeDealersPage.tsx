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

import type { Dealer, UpsertDealerInput } from "../../shared/contracts";
import { upsertDealerSchema } from "../../shared/contracts";
import { apiClient } from "../api/client";
import { useApiQuery } from "../hooks/useApiQuery";
import { EmptyState } from "../ui/EmptyState";
import { PageHeader } from "../ui/PageHeader";

type DealerFormState = UpsertDealerInput;

const emptyDealerForm: DealerFormState = {
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
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDealer, setEditingDealer] = useState<Dealer | null>(null);
  const [form, setForm] = useState<DealerFormState>(emptyDealerForm);
  const deferredSearch = useDeferredValue(search);

  const dealersQuery = useApiQuery(
    async (signal) => {
      const response = await apiClient.get<Dealer[]>("/ho/dealers", { signal });
      return response.data;
    },
    [],
  );

  const dealers = dealersQuery.data ?? [];

  const filteredDealers = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();

    return dealers.filter((dealer) => {
      if (!query) {
        return true;
      }

      return (
        dealer.code.toLowerCase().includes(query) ||
        dealer.name.toLowerCase().includes(query) ||
        dealer.region.toLowerCase().includes(query) ||
        dealer.contactPerson.toLowerCase().includes(query)
      );
    });
  }, [dealers, deferredSearch]);

  function openCreateDialog() {
    setEditingDealer(null);
    setForm(emptyDealerForm);
    setDialogOpen(true);
  }

  function openEditDialog(dealer: Dealer) {
    setEditingDealer(dealer);
    setForm({
      code: dealer.code,
      name: dealer.name,
      region: dealer.region,
      contactPerson: dealer.contactPerson,
      phone: dealer.phone,
      email: dealer.email,
      active: dealer.active,
      password: "",
    });
    setDialogOpen(true);
  }

  async function saveDealer() {
    const parsed = upsertDealerSchema.safeParse(form);

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Enter a valid dealer record.");
      return;
    }

    try {
      if (editingDealer) {
        await apiClient.put(`/ho/dealers/${editingDealer.id}`, parsed.data);
        toast.success("Dealer updated.");
      } else {
        await apiClient.post("/ho/dealers", parsed.data);
        toast.success("Dealer created.");
      }

      setDialogOpen(false);
      setEditingDealer(null);
      setForm(emptyDealerForm);
      dealersQuery.refresh();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message ?? "Unable to save dealer.");
      } else {
        toast.error("Unable to save dealer.");
      }
    }
  }

  if (dealersQuery.loading) {
    return <Typography color="text.secondary">Loading dealers...</Typography>;
  }

  if (!dealersQuery.data) {
    return (
      <EmptyState
        title="Dealer master unavailable"
        description={dealersQuery.error ?? "We could not load dealer records."}
        actionLabel="Reload"
        onAction={dealersQuery.refresh}
      />
    );
  }

  return (
    <Stack spacing={3.5}>
      <PageHeader
        eyebrow="Dealer Master"
        title="Manage dealer access"
        description="Create, update, or deactivate dealer accounts and control the login credentials used in the dealer portal."
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

      {filteredDealers.length === 0 ? (
        <EmptyState
          title="No dealer records found"
          description="Adjust your search or create a new dealer account."
          actionLabel="Add dealer"
          onAction={openCreateDialog}
        />
      ) : (
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
              {filteredDealers.map((dealer) => (
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
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{editingDealer ? "Edit dealer" : "Create dealer"}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} mt={0.5}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Dealer code"
                value={form.code}
                onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Dealer name"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Region"
                value={form.region}
                onChange={(event) => setForm((current) => ({ ...current, region: event.target.value }))}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Contact person"
                value={form.contactPerson}
                onChange={(event) =>
                  setForm((current) => ({ ...current, contactPerson: event.target.value }))
                }
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Phone"
                value={form.phone}
                onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 8 }}>
              <TextField
                fullWidth
                label={editingDealer ? "Reset password (optional)" : "Password"}
                type="password"
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper sx={{ p: 2, height: "100%" }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography fontWeight={700}>Account active</Typography>
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
          <Button variant="contained" onClick={saveDealer}>
            Save dealer
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
