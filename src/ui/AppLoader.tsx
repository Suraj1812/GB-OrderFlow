import { CircularProgress, Stack, Typography } from "@mui/material";

export function AppLoader({ label }: { label: string }) {
  return (
    <Stack
      minHeight="100vh"
      alignItems="center"
      justifyContent="center"
      spacing={2}
    >
      <CircularProgress color="secondary" />
      <Typography color="text.secondary">{label}</Typography>
    </Stack>
  );
}
