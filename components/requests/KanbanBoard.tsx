"use client";

import { DragDropContext, Draggable, Droppable, type DropResult } from "@hello-pangea/dnd";
import { STATUSES, STATUS_LABELS, CLOSING_STATUSES, type Status } from "@/lib/domain";
import type { RequestDTO } from "@/types";
import RequestCard from "./RequestCard";

export default function KanbanBoard({
  requests,
  onCardClick,
  onStatusChange,
  onCloseFlow,
  canMoveStatus,
}: {
  requests: RequestDTO[];
  onCardClick: (req: RequestDTO) => void;
  onStatusChange: (req: RequestDTO, status: Status) => void;
  onCloseFlow: (req: RequestDTO, closeStatus: "done" | "refused") => void;
  canMoveStatus: boolean;
}) {
  const byStatus = new Map<Status, RequestDTO[]>(STATUSES.map((s) => [s, []]));
  for (const r of requests) {
    byStatus.get(r.status)?.push(r);
  }

  function handleDragEnd(result: DropResult) {
    if (!canMoveStatus) return;
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;

    const req = requests.find((r) => r.id === draggableId);
    if (!req) return;

    const destStatus = destination.droppableId as Status;
    if (CLOSING_STATUSES.includes(destStatus)) {
      onCloseFlow(req, destStatus as "done" | "refused");
      return;
    }
    onStatusChange(req, destStatus);
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STATUSES.map((status) => (
          <Droppable droppableId={status} key={status}>
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps} className="flex w-72 shrink-0 flex-col">
                <div className="mb-2 flex items-center justify-between px-1">
                  <h3 className="text-sm font-semibold text-text-secondary">{STATUS_LABELS[status]}</h3>
                  <span className="text-xs text-text-muted">{byStatus.get(status)?.length ?? 0}</span>
                </div>
                <div className="flex min-h-[100px] flex-1 flex-col gap-2 rounded-card bg-surface-border/20 p-2">
                  {byStatus.get(status)?.map((req, index) => (
                    <Draggable draggableId={req.id} index={index} key={req.id} isDragDisabled={!canMoveStatus}>
                      {(dragProvided) => (
                        <div ref={dragProvided.innerRef} {...dragProvided.draggableProps}>
                          <RequestCard
                            request={req}
                            onClick={() => onCardClick(req)}
                            dragHandleProps={dragProvided.dragHandleProps}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              </div>
            )}
          </Droppable>
        ))}
      </div>
    </DragDropContext>
  );
}
