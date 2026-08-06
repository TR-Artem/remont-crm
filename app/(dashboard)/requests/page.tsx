"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import BranchSelect from "@/components/BranchSelect";
import KanbanBoard from "@/components/requests/KanbanBoard";
import ClientCardModal from "@/components/requests/ClientCardModal";
import CloseRequestModal from "@/components/requests/CloseRequestModal";
import type { RequestDTO, AdSourceDTO, MasterDTO } from "@/types";
import type { Status, Role } from "@/lib/domain";

export default function RequestsPage() {
  const { data: session } = useSession();
  const role = session?.user?.role as Role | undefined;

  const [requests, setRequests] = useState<RequestDTO[]>([]);
  const [sources, setSources] = useState<AdSourceDTO[]>([]);
  const [masters, setMasters] = useState<MasterDTO[]>([]);
  const [branchId, setBranchId] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<RequestDTO | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [closeFlow, setCloseFlow] = useState<{ req: RequestDTO; initialStatus?: "done" | "refused" } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (branchId) params.set("branchId", branchId);
    const [reqRes, srcRes, masterRes] = await Promise.all([
      fetch(`/api/requests?${params.toString()}`),
      fetch("/api/ad-sources"),
      fetch("/api/masters"),
    ]);
    if (reqRes.ok) setRequests(await reqRes.json());
    if (srcRes.ok) setSources(await srcRes.json());
    if (masterRes.ok) setMasters(await masterRes.json());
    setLoading(false);
  }, [branchId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleStatusChange(req: RequestDTO, status: Status) {
    setRequests((prev) => prev.map((r) => (r.id === req.id ? { ...r, status } : r)));
    const res = await fetch(`/api/requests/${req.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      load(); // откатываем оптимистичное обновление при ошибке (например, 403)
    }
  }

  if (!role) return null;

  const canCreate = ["callcenter", "director", "regional_director"].includes(role);
  const canMoveStatus = ["callcenter", "admin", "director", "regional_director"].includes(role);

  return (
    <div>
      <PageHeader
        title="Заявки"
        action={
          canCreate ? (
            <button className="btn-primary" onClick={() => setShowCreate(true)}>
              + Новая заявка
            </button>
          ) : undefined
        }
      />

      {role === "director" && (
        <div className="card mb-4 flex flex-wrap items-end gap-3 p-3">
          <div className="w-56">
            <BranchSelect value={branchId} onChange={setBranchId} />
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-text-secondary">Загрузка…</p>
      ) : (
        <KanbanBoard
          requests={requests}
          onCardClick={setSelected}
          onStatusChange={handleStatusChange}
          onCloseFlow={(req, status) => setCloseFlow({ req, initialStatus: status })}
          canMoveStatus={canMoveStatus}
        />
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Новая заявка" wide>
        <ClientCardModal
          request={null}
          sources={sources}
          masters={masters}
          role={role}
          onClose={() => setShowCreate(false)}
          onSaved={load}
          onRequestCloseFlow={() => {}}
        />
      </Modal>

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Карточка клиента" wide>
        {selected && (
          <ClientCardModal
            request={selected}
            sources={sources}
            masters={masters}
            role={role}
            onClose={() => setSelected(null)}
            onSaved={load}
            onRequestCloseFlow={(req) => {
              setSelected(null);
              setCloseFlow({ req });
            }}
          />
        )}
      </Modal>

      <Modal open={!!closeFlow} onClose={() => setCloseFlow(null)} title="Закрытие заявки">
        {closeFlow && (
          <CloseRequestModal
            request={closeFlow.req}
            initialStatus={closeFlow.initialStatus}
            editMode={!!closeFlow.req.closedAt}
            onClose={() => setCloseFlow(null)}
            onSaved={load}
          />
        )}
      </Modal>
    </div>
  );
}
