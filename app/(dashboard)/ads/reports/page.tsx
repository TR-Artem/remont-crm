"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import BranchSelect from "@/components/BranchSelect";
import type { Role } from "@/lib/domain";

interface ReportDTO {
  id: string;
  date: string;
  promotersCount: number;
  flyersDistributed: number;
  stickersDistributed: number;
  postersDistributed: number;
}

export default function AdReportsPage() {
  const { data: session } = useSession();
  const role = session?.user?.role as Role | undefined;

  const [reports, setReports] = useState<ReportDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<ReportDTO | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [branchId, setBranchId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (branchId) params.set("branchId", branchId);
    const res = await fetch(`/api/ad-reports?${params.toString()}`);
    if (res.ok) setReports(await res.json());
    setLoading(false);
  }, [from, to, branchId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <PageHeader
        title="Ежедневные отчёты по рекламе"
        action={
          <button className="btn-primary" onClick={() => setShowAdd(true)}>
            + Новый отчёт
          </button>
        }
      />

      <div className="card mb-4 flex flex-wrap items-end gap-3 p-3">
        <div>
          <label className="field-label">С</label>
          <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="field-label">По</label>
          <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        {(role === "director" || role === "admin") && <BranchSelect value={branchId} onChange={setBranchId} />}
      </div>

      {loading ? (
        <p className="text-text-secondary">Загрузка…</p>
      ) : (
        <div className="space-y-4">
          {reports.length > 0 && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="card p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">Промоутеро-дней</p>
                <p className="mt-1 text-xl font-semibold text-text">
                  {reports.reduce((s, r) => s + r.promotersCount, 0)}
                </p>
              </div>
              <div className="card p-4" style={{ backgroundColor: "#FFF4DE", borderColor: "transparent" }}>
                <p className="text-xs font-medium uppercase tracking-wide text-warning">Разнесено листовок</p>
                <p className="mt-1 text-xl font-semibold text-warning">
                  {reports.reduce((s, r) => s + r.flyersDistributed, 0)}
                </p>
              </div>
              <div className="card p-4" style={{ backgroundColor: "#E9E4FF", borderColor: "transparent" }}>
                <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "#6D3FE0" }}>
                  Разнесено наклеек
                </p>
                <p className="mt-1 text-xl font-semibold" style={{ color: "#6D3FE0" }}>
                  {reports.reduce((s, r) => s + r.stickersDistributed, 0)}
                </p>
              </div>
              <div className="card p-4" style={{ backgroundColor: "#E5F8EE", borderColor: "transparent" }}>
                <p className="text-xs font-medium uppercase tracking-wide text-success">Разнесено расклеек</p>
                <p className="mt-1 text-xl font-semibold text-success">
                  {reports.reduce((s, r) => s + r.postersDistributed, 0)}
                </p>
              </div>
            </div>
          )}

          <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border text-left text-text-secondary">
                <th className="p-3">Дата</th>
                <th className="p-3">Промоутеров</th>
                <th className="p-3">Листовок</th>
                <th className="p-3">Наклеек</th>
                <th className="p-3">Расклеек</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id} className="border-b border-surface-border last:border-0">
                  <td className="p-3">{new Date(r.date).toLocaleDateString("ru-RU")}</td>
                  <td className="p-3">{r.promotersCount}</td>
                  <td className="p-3">{r.flyersDistributed}</td>
                  <td className="p-3">{r.stickersDistributed}</td>
                  <td className="p-3">{r.postersDistributed}</td>
                  <td className="p-3">
                    <button className="text-accent text-xs font-medium" onClick={() => setEditing(r)}>
                      Изменить
                    </button>
                  </td>
                </tr>
              ))}
              {reports.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-text-muted">
                    Отчётов пока нет
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Новый отчёт за день">
        <ReportForm
          onDone={() => {
            setShowAdd(false);
            load();
          }}
        />
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Редактирование отчёта">
        {editing && (
          <ReportForm
            report={editing}
            onDone={() => {
              setEditing(null);
              load();
            }}
          />
        )}
      </Modal>
    </div>
  );
}

function ReportForm({ report, onDone }: { report?: ReportDTO; onDone: () => void }) {
  const [date, setDate] = useState(report?.date.slice(0, 10) ?? new Date().toISOString().slice(0, 10));
  const [promotersCount, setPromotersCount] = useState(report?.promotersCount ?? 0);
  const [flyers, setFlyers] = useState(report?.flyersDistributed ?? 0);
  const [stickers, setStickers] = useState(report?.stickersDistributed ?? 0);
  const [posters, setPosters] = useState(report?.postersDistributed ?? 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(report ? `/api/ad-reports/${report.id}` : "/api/ad-reports", {
        method: report ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          promotersCount,
          flyersDistributed: flyers,
          stickersDistributed: stickers,
          postersDistributed: posters,
        }),
      });
      if (!res.ok) throw new Error("Не удалось сохранить отчёт");
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="field-label">Дата отчёта</label>
        <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="field-label">Промоутеров работало</label>
          <input type="number" min={0} className="input" value={promotersCount} onChange={(e) => setPromotersCount(Number(e.target.value))} />
        </div>
        <div>
          <label className="field-label">Разнесено листовок</label>
          <input type="number" min={0} className="input" value={flyers} onChange={(e) => setFlyers(Number(e.target.value))} />
        </div>
        <div>
          <label className="field-label">Разнесено наклеек</label>
          <input type="number" min={0} className="input" value={stickers} onChange={(e) => setStickers(Number(e.target.value))} />
        </div>
        <div>
          <label className="field-label">Разнесено расклеек</label>
          <input type="number" min={0} className="input" value={posters} onChange={(e) => setPosters(Number(e.target.value))} />
        </div>
      </div>
      {error && <div className="rounded-btn bg-danger-light px-3 py-2 text-sm text-danger">{error}</div>}
      <button className="btn-primary" onClick={handleSubmit} disabled={saving}>
        {saving ? "Сохраняем…" : "Сохранить"}
      </button>
    </div>
  );
}
