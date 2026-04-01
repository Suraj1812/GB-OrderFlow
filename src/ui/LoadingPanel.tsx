import { Paper, Skeleton, Stack } from "@mui/material";

export function LoadingPanel({ rows = 4 }: { rows?: number }) {
  return (
    <Paper sx={{ p: 2.5 }}>
      <Stack spacing={1.5}>
        {Array.from({ length: rows }, (_, index) => (
          <Skeleton
            key={index}
            variant="rounded"
            height={index === 0 ? 56 : 88}
            animation="wave"
          />
        ))}
      </Stack>
    </Paper>
  );
}
