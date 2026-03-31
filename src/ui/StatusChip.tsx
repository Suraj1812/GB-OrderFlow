import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import DangerousRoundedIcon from "@mui/icons-material/DangerousRounded";
import { Chip } from "@mui/material";

import type { OrderStatus } from "../../shared/contracts";

export function StatusChip({ status }: { status: OrderStatus }) {
  if (status === "approved") {
    return (
      <Chip
        color="success"
        icon={<CheckCircleRoundedIcon />}
        label="Approved"
        variant="filled"
      />
    );
  }

  if (status === "rejected") {
    return (
      <Chip
        color="error"
        icon={<DangerousRoundedIcon />}
        label="Rejected"
        variant="filled"
      />
    );
  }

  return (
    <Chip
      color="warning"
      icon={<AccessTimeRoundedIcon />}
      label="Pending"
      variant="filled"
    />
  );
}

