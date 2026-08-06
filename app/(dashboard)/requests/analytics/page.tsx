"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import PageHeader from "@/components/PageHeader";
import BranchSelect from "@/components/BranchSelect";
import { STATUS_COLORS, type Status, type Role } from "@/lib/domain";

interface AnalyticsData {
  total: number;
  done: { count: number; percent: number };
  refused: { count: number; percent: number };
  inProgress: Record<string, number>;
  statusDistribution: { status: Status; label: string; count: number }[];
  topRefusalReasons: { reason: string; count: number }[];
}

export default function RequestsAnalyticsPage() {
  const { data: session } = useSession();
  const role = session?.user?.role as Role | undefined;

  const [data, setData] = useState<AnalyticsData | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [branchId, setBranchId] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (branchId) params.set("branchId", branchId);
    const res = await fetch(`/api/analytics/requests?${params.toString()}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [from, to, branchId]);

  useEffect(() => {
    load();
  }, [load]);

  const inProgressTotal = data
    ? data.inProgress.waiting + data.inProgress.on_the_way + data.inProgress.in_progress + data.inProgress.in_progress_complex
    : 0;
  const inProgressPercent = data && data.total > 0 ? Math.round((inProgressTotal / data.total) * 1000) / 10 : 0;

  const sortedStatuses = data ? [...data.statusDistribution].sort((a, b) => b.count - a.count) : [];
  const maxStatusCount = data ? Math.max(1, ...data.statusDistribution.map((s) => s.count)) : 1;
  const maxReasonCount = data ? Math.max(1, ...data.topRefusalReasons.map((r) => r.count)) : 1;

  return (
    <div>
      <PageHeader title="Аналитика заявок" />

      <div className="card mb-4 flex flex-wrap items-end gap-3 p-3">
        <div>
          <label className="field-label">С</label>
          <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="field-label">По</label>
          <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        {role === "director" && <BranchSelect value={branchId} onChange={setBranchId} />}
      </div>

      {loading || !data ? (
        <p className="text-text-secondary">Загрузка…</p>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div className="card p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">Всего заявок</p>
              <p className="mt-1 text-2xl font-semibold text-text">{data.total}</p>
            </div>
            <div className="card p-4" style={{ backgroundColor: "#E5F8EE", borderColor: "transparent" }}>
              <p className="text-xs font-medium uppercase tracking-wide text-success">Закрыто «Готово»</p>
              <p className="mt-1 text-2xl font-semibold text-success">
                {data.done.count} <span className="text-sm font-normal">· {data.done.percent}%</span>
              </p>
            </div>
            <div className="card p-4" style={{ backgroundColor: "#FDEAEA", borderColor: "transparent" }}>
              <p className="text-xs font-medium uppercase tracking-wide text-danger">«Отказ»</p>
              <p className="mt-1 text-2xl font-semibold text-danger">
                {data.refused.count} <span className="text-sm font-normal">· {data.refused.percent}%</span>
              </p>
            </div>
            <div className="card p-4" style={{ backgroundColor: "#FFF4DE", borderColor: "transparent" }}>
              <p className="text-xs font-medium uppercase tracking-wide text-warning">В работе / в пути</p>
              <p className="mt-1 text-2xl font-semibold text-warning">
                {inProgressTotal} <span className="text-sm font-normal">· {inProgressPercent}%</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="card p-4">
              <h3 className="mb-4 text-sm font-semibold text-text-secondary">Заявки по статусам</h3>
              <div className="space-y-3">
                {sortedStatuses.map((s) => {
                  const color = STATUS_COLORS[s.status];
                  return (
                    <div key={s.status}>
                      <p className="mb-1 text-sm text-text">{s.label}</p>
                      <div className="flex items-center gap-2">
                        <div className="h-3 flex-1 rounded-full bg-surface">
                          <div
                            className="h-3 rounded-full"
                            style={{ width: `${(s.count / maxStatusCount) * 100}%`, backgroundColor: color.text }}
                          />
                        </div>
                        <span className="w-8 text-right text-sm font-medium text-text">{s.count}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-4 text-xs text-text-muted">
                Данные считаются автоматически при закрытии заявки администратором (статус «Готово» или «Отказ»)
              </p>
            </div>

            <div className="card p-4">
              <h3 className="mb-4 text-sm font-semibold text-text-secondary">Топ причин отказа</h3>
              {data.topRefusalReasons.length === 0 ? (
                <p className="text-sm text-text-muted">Отказов за период нет</p>
              ) : (
                <div className="space-y-3">
                  {data.topRefusalReasons.map((r) => (
                    <div key={r.reason}>
                      <p className="mb-1 text-sm text-text">{r.reason}</p>
                      <div className="flex items-center gap-2">
                        <div className="h-3 flex-1 rounded-full bg-surface">
                          <div
                            className="h-3 rounded-full"
                            style={{ width: `${(r.count / maxReasonCount) * 100}%`, backgroundColor: "#DC2626" }}
                          />
                        </div>
                        <span className="w-8 text-right text-sm font-medium text-text">{r.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {data.total > 0 && (
                <div className="mt-4 border-t border-surface-border pt-4 text-xs">
                  <p className="font-semibold text-text-secondary">Вывод</p>
                  <p className="mt-1 text-text-muted">
                    Конверсия в «Готово» {data.done.percent >= 60 ? "стабильно высокая" : "требует внимания"} (
                    {data.done.percent}%).
                    {data.topRefusalReasons[0] &&
                      ` Стоит обратить внимание на причину отказа «${data.topRefusalReasons[0].reason}» — она встречается чаще остальных.`}
                  </p>
                </div>
              )}
            </div>
          </div>

          <p className="text-xs text-text-muted">
            Доступно ролям: Директор, региональный директор — полная аналитика по всем точкам
          </p>
        </div>
      )}
    </div>
  );
}
