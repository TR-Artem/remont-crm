"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import PageHeader from "@/components/PageHeader";
import BranchSelect from "@/components/BranchSelect";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { Role } from "@/lib/domain";

interface RankingItem {
  id: string;
  name: string;
  calls: number;
  share: number;
  conversion: number;
}
interface AnalyticsData {
  totalCalls: number;
  conversionRate: number;
  ranking: RankingItem[];
  best: RankingItem | null;
  worst: RankingItem | null;
}

const PIE_COLORS = ["#2F6FED", "#6D3FE0", "#1CA05C", "#B8860B", "#DC2626", "#9AA1B0", "#2F6FED"];

export default function AdsAnalyticsPage() {
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
    const res = await fetch(`/api/analytics/ads?${params.toString()}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [from, to, branchId]);

  useEffect(() => {
    load();
  }, [load]);

  const maxCalls = data ? Math.max(1, ...data.ranking.map((r) => r.calls)) : 1;

  return (
    <div>
      <PageHeader title="Аналитика рекламы" />

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

      {loading || !data ? (
        <p className="text-text-secondary">Загрузка…</p>
      ) : data.ranking.length === 0 ? (
        <p className="text-text-secondary">За выбранный период звонков по источникам рекламы нет.</p>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <StatCard label="Всего звонков" value={data.totalCalls} />
            <StatCard
              label="Лучший источник"
              value={data.best ? data.best.name : "—"}
              sub={data.best ? `${data.best.calls} звонка · ${data.best.share}%` : undefined}
              accent="success"
            />
            <StatCard
              label="Слабый источник"
              value={data.worst ? data.worst.name : "—"}
              sub={data.worst ? `${data.worst.calls} звонков · ${data.worst.share}%` : undefined}
              accent="danger"
            />
            <StatCard label="Конверсия в заявку" value={`${data.conversionRate}%`} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="card p-4">
              <h3 className="mb-4 text-sm font-semibold text-text-secondary">Звонки по источникам рекламы</h3>
              <div className="space-y-3">
                {data.ranking.map((r, i) => (
                  <div key={r.id}>
                    <p className="mb-1 text-sm text-text">{r.name}</p>
                    <div className="flex items-center gap-2">
                      <div className="h-3 flex-1 rounded-full bg-surface">
                        <div
                          className="h-3 rounded-full"
                          style={{
                            width: `${(r.calls / maxCalls) * 100}%`,
                            backgroundColor: PIE_COLORS[i % PIE_COLORS.length],
                          }}
                        />
                      </div>
                      <span className="w-8 text-right text-sm font-medium text-text">{r.calls}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-4">
              <h3 className="mb-3 text-sm font-semibold text-text-secondary">Доля источников</h3>
              <div className="flex items-center gap-4">
                <div className="relative h-48 w-48 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={data.ranking} dataKey="calls" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={1}>
                        {data.ranking.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <span className="text-xl font-semibold text-text">{data.totalCalls}</span>
                  </div>
                </div>
                <ul className="space-y-1.5 text-xs">
                  {data.ranking.map((r, i) => (
                    <li key={r.id} className="flex items-center gap-1.5">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                      />
                      <span className="text-text-secondary">
                        {r.name} — {r.share}%
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-4 space-y-3 border-t border-surface-border pt-4 text-xs">
                <div>
                  <p className="font-semibold text-text-secondary">Откуда данные</p>
                  <p className="mt-1 text-text-muted">
                    Каждый звонок в карточке клиента помечается полем «По какой рекламе звонят» — система считает
                    источники автоматически, без ручных подсчётов.
                  </p>
                </div>
                {data.best && data.worst && (
                  <div>
                    <p className="font-semibold text-text-secondary">Вывод</p>
                    <p className="mt-1 text-text-muted">
                      Увеличить бюджет на «{data.best.name}», пересмотреть «{data.worst.name}»
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border text-left text-text-secondary">
                  <th className="p-3">Источник</th>
                  <th className="p-3">Звонков</th>
                  <th className="p-3">Доля</th>
                  <th className="p-3">Конверсия в «Готово»</th>
                </tr>
              </thead>
              <tbody>
                {data.ranking.map((r) => (
                  <tr key={r.id} className="border-b border-surface-border last:border-0">
                    <td className="p-3">{r.name}</td>
                    <td className="p-3">{r.calls}</td>
                    <td className="p-3">{r.share}%</td>
                    <td className="p-3">{r.conversion}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-text-muted">
            Доступно ролям: Директор, региональный директор, администратор — полная аналитика по всем точкам
          </p>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: "success" | "danger";
}) {
  const color = accent === "success" ? "#1CA05C" : accent === "danger" ? "#DC2626" : "#1C2333";
  const bg = accent === "success" ? "#E5F8EE" : accent === "danger" ? "#FDEAEA" : undefined;
  return (
    <div className="card p-4" style={bg ? { backgroundColor: bg, borderColor: "transparent" } : undefined}>
      <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">{label}</p>
      <p className="mt-1 truncate text-lg font-semibold" style={{ color }}>
        {value}
      </p>
      {sub && (
        <p className="mt-0.5 text-xs" style={{ color }}>
          {sub}
        </p>
      )}
    </div>
  );
}
