import Chip from "@mui/material/Chip";
import Box from "@mui/material/Box";

interface Props {
  status: "confirmed" | "waitlisted" | "cancelled";
  isCoachChild?: boolean;
  checkedIn?: boolean;
  size?: "small" | "medium";
}

const statusColor = {
  confirmed: "success",
  waitlisted: "warning",
  cancelled: "error",
} as const;

export function RegistrationStatusChip({ status, isCoachChild, checkedIn, size = "small" }: Props) {
  return (
    <Box sx={{ display: "inline-flex", gap: 0.5, alignItems: "center" }}>
      <Chip label={status} size={size} color={statusColor[status]} />
      {isCoachChild && <Chip label="Coach reserved" size={size} color="info" variant="outlined" />}
      {checkedIn && <Chip label="✓ Present" size={size} color="success" variant="outlined" />}
    </Box>
  );
}
