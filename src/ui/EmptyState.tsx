import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon,
}: EmptyStateProps) {
  return (
    <Paper sx={{ p: 4, textAlign: "center" }}>
      <Stack spacing={2} alignItems="center">
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            bgcolor: "rgba(192,57,43,0.08)",
            color: "secondary.main",
          }}
        >
          {icon ?? <Inventory2RoundedIcon />}
        </Box>
        <Typography variant="h5">{title}</Typography>
        <Typography maxWidth={480} color="text.secondary">
          {description}
        </Typography>
        {actionLabel && onAction ? (
          <Button variant="contained" color="primary" onClick={onAction}>
            {actionLabel}
          </Button>
        ) : null}
      </Stack>
    </Paper>
  );
}

