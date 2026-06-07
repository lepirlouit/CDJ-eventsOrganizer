import Chip from "@mui/material/Chip";

type EventStatus = "draft" | "published" | "cancelled" | "completed";

const colorMap: Record<EventStatus, "default" | "success" | "error" | "info"> = {
  draft: "default",
  published: "success",
  cancelled: "error",
  completed: "info",
};

interface Props {
  status: EventStatus;
  size?: "small" | "medium";
}

export function EventStatusChip({ status, size = "small" }: Props) {
  return <Chip label={status} size={size} color={colorMap[status] ?? "default"} />;
}
