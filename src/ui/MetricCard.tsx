import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import {
  alpha,
  Box,
  Card,
  CardContent,
  Stack,
  Typography,
} from "@mui/material";
import type { ElementType } from "react";

interface MetricCardProps {
  label: string;
  value: string;
  helper?: string;
  icon?: ElementType;
}

export function MetricCard({
  label,
  value,
  helper,
  icon: Icon = TrendingUpRoundedIcon,
}: MetricCardProps) {
  return (
    <Card className="mesh-panel" sx={{ height: "100%" }}>
      <CardContent sx={{ position: "relative", p: 3 }}>
        <Stack direction="row" justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="overline">{label}</Typography>
            <Typography mt={1} variant="h4">
              {value}
            </Typography>
            {helper ? (
              <Typography mt={1.25} color="text.secondary">
                {helper}
              </Typography>
            ) : null}
          </Box>
          <Box
            sx={{
              width: 52,
              height: 52,
              display: "grid",
              placeItems: "center",
              borderRadius: 3,
              backgroundColor: alpha("#c0392b", 0.12),
              color: "secondary.main",
            }}
          >
            <Icon />
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
