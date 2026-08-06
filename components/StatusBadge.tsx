import { STATUS_COLORS, STATUS_LABELS, type Status } from "@/lib/domain";

export default function StatusBadge({ status }: { status: Status }) {
  const c = STATUS_COLORS[status];
  return (
    <span className="pill" style={{ backgroundColor: c.bg, color: c.text }}>
      {STATUS_LABELS[status]}
    </span>
  );
}
