"use client";

import type { DraggableProvidedDragHandleProps } from "@hello-pangea/dnd";
import type { RequestDTO } from "@/types";
import { formatElapsed } from "@/lib/domain";

export default function RequestCard({
  request,
  onClick,
  dragHandleProps,
}: {
  request: RequestDTO;
  onClick: () => void;
  dragHandleProps?: DraggableProvidedDragHandleProps | null;
}) {
  const isRefused = request.status === "refused";
  const isDone = request.status === "done";
  const isWaiting = request.status === "waiting";

  return (
    <div
      onClick={onClick}
      {...dragHandleProps}
      className="card cursor-pointer p-3 transition-shadow hover:border-accent/40 hover:shadow-sm"
    >
      <p className="text-sm font-semibold text-text">{request.clientName}</p>

      {isRefused ? (
        <p className="mt-0.5 text-xs text-text-muted">{request.refusalReason ?? "Причина не указана"}</p>
      ) : (
        <>
          <p className="mt-0.5 text-xs text-text-secondary">{request.address}</p>
          <p className="mt-1 truncate text-xs text-text-muted">{request.reason}</p>
        </>
      )}

      <div className="mt-2 flex flex-wrap gap-1">
        {isWaiting && (
          <span className="pill" style={{ backgroundColor: "#F0F1F4", color: "#6B7280" }}>
            {formatElapsed(new Date(request.createdAt))}
          </span>
        )}
        {request.assignedMaster && !isRefused && (
          <span className="pill" style={{ backgroundColor: "#E9E4FF", color: "#6D3FE0" }}>
            Мастер: {request.assignedMaster.name}
          </span>
        )}
        {request.status === "in_progress_complex" && (
          <span className="pill" style={{ backgroundColor: "#FFF4DE", color: "#B8860B" }}>
            Требует СД
          </span>
        )}
        {isDone && request.amountRecorded !== null && (
          <span className="pill" style={{ backgroundColor: "#E5F8EE", color: "#1CA05C" }}>
            {request.amountRecorded.toLocaleString("ru-RU")} ₽
          </span>
        )}
        {isRefused && (
          <span className="pill" style={{ backgroundColor: "#FDEAEA", color: "#DC2626" }}>
            Закрыто
          </span>
        )}
      </div>
    </div>
  );
}
