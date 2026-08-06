"use client";

import { useEffect, useState } from "react";

function formatRemaining(ms: number) {
  const totalMinutes = Math.floor(ms / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 0) return `${h} ч ${m} мин`;
  return `${m} мин`;
}

export default function EditWindowBadge({
  deadline,
  availableLabel = "Правка доступна ещё",
  expiredLabel = "Правка недоступна",
}: {
  deadline: Date;
  availableLabel?: string;
  expiredLabel?: string;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const remaining = deadline.getTime() - now;
  const expired = remaining <= 0;

  return (
    <span
      className="pill"
      style={
        expired
          ? { backgroundColor: "#FDEAEA", color: "#DC2626" }
          : { backgroundColor: "#FFF4DE", color: "#B8860B" }
      }
      title={expired ? "Прошло более установленного времени с момента создания/закрытия" : undefined}
    >
      {expired ? expiredLabel : `${availableLabel} ${formatRemaining(remaining)}`}
    </span>
  );
}
