import { Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: PageHeaderProps) {
  return (
    <Stack
      direction={{ xs: "column", md: "row" }}
      justifyContent="space-between"
      alignItems={{ xs: "flex-start", md: "flex-end" }}
      spacing={2}
    >
      <Stack spacing={1}>
        <Typography variant="overline">{eyebrow}</Typography>
        <Typography variant="h3">{title}</Typography>
        <Typography maxWidth={720} color="text.secondary">
          {description}
        </Typography>
      </Stack>
      {actions}
    </Stack>
  );
}

