"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import BranchSelect from "@/components/BranchSelect";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { CASH_TX_LABELS, type CashTxType, type Role } from "@/lib/domain";

interface TxDTO {
  id: string;
  type: CashTxType;
  amount: number;
  comment: string | null;
  date: string;
  request: { clientName: string } | null;
  master: { name: string } | null;
  createdBy: { name: string };
}

export default function AccountingPage() {
  const { data: session } = useSession();
  const role = session?.user?.role as Role | undefined;

  const [transactions, setTransactions] = useState<TxDTO[]>([]);
  const [totals, setTotals] = useState({ income: 0, expense: 0, salary: 0, balance: 0 });
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [branchId, setBranchId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (branchId) params.set("branchId", branchId);
    const res = await fetch(`/api/cash?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setTransactions(data.transactions);
      setTotals(data.totals);
    }
    setLoading(false);
  }, [from, to, branchId]);

  useEffect(() => {
    load();
  }, [load]);

  const byDay = new Map<string, { date: string; income: number; expense: number; salary: number }>();
  for (const t of transactions) {
    const day = new Date(t.date).toLocaleDateString("ru-RU");
    const entry = byDay.get(day) ?? { date: day, income: 0, expense: 0, salary: 0 };
    entry[t.type] += t.amount;
    byDay.set(day, entry);
  }
  const chartData = Array.from(byDay.values()).reverse();

  return (
    <div>
      <PageHeader
        title="Бухгалтерия"
        action={
          <button className="btn-primary" onClick={() => setShowAdd(true)}>
            + Внести операцию
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
        {role === "director" && <BranchSelect value={branchId} onChange={setBranchId} />}
      </div>

      {loading ? (
        <p className="text-text-secondary">Загрузка…</p>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="card p-4">
              <p className="text-xs text-text-secondary">Приход</p>
              <p className="mt-1 text-xl font-semibold text-success">{totals.income} ₽</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-text-secondary">Расход</p>
              <p className="mt-1 text-xl font-semibold text-danger">{totals.expense} ₽</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-text-secondary">Зарплаты мастеров</p>
              <p className="mt-1 text-xl font-semibold" style={{ color: "#6D3FE0" }}>
                {totals.salary} ₽
              </p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-text-secondary">Итог</p>
              <p className="mt-1 text-xl font-semibold text-text">{totals.balance} ₽</p>
            </div>
          </div>

          <div className="card p-4">
            <h3 className="mb-3 text-sm font-semibold text-text-secondary">Динамика кассы по дням</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData}>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="income" fill="#1CA05C" name="Приход" />
                <Bar dataKey="expense" fill="#DC2626" name="Расход" />
                <Bar dataKey="salary" fill="#6D3FE0" name="Зарплаты" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border text-left text-text-secondary">
                  <th className="p-3">Дата</th>
                  <th className="p-3">Заявка / операция</th>
                  <th className="p-3">Тип</th>
                  <th className="p-3">Мастер</th>
                  <th className="p-3">Сумма</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id} className="border-b border-surface-border last:border-0">
                    <td className="p-3">{new Date(t.date).toLocaleDateString("ru-RU")}</td>
                    <td className="p-3">{t.request?.clientName ?? t.comment ?? "—"}</td>
                    <td className="p-3">{CASH_TX_LABELS[t.type]}</td>
                    <td className="p-3">{t.master?.name ?? "—"}</td>
                    <td className="p-3 font-medium">{t.amount} ₽</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-text-muted">
            Полный доступ у роли: Директор / Региональный директор. Данные формируются автоматически из закрытых заявок.
          </p>
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Новая операция">
        <ExpenseForm
          onDone={() => {
            setShowAdd(false);
            load();
          }}
        />
      </Modal>
    </div>
  );
}

function ExpenseForm({ onDone }: { onDone: () => void }) {
  const [type, setType] = useState<"expense" | "salary">("expense");
  const [amount, setAmount] = useState("");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/cash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, amount: parseFloat(amount), comment }),
      });
      if (!res.ok) throw new Error("Не удалось сохранить операцию");
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
        <label className="field-label">Тип</label>
        <select className="input" value={type} onChange={(e) => setType(e.target.value as "expense" | "salary")}>
          <option value="expense">Расход</option>
          <option value="salary">Зарплата (ручная корректировка)</option>
        </select>
      </div>
      <div>
        <label className="field-label">Сумма, ₽</label>
        <input type="number" className="input" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </div>
      <div>
        <label className="field-label">Комментарий</label>
        <input className="input" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Закупка расходников" />
      </div>
      {error && <div className="rounded-btn bg-danger-light px-3 py-2 text-sm text-danger">{error}</div>}
      <button className="btn-primary" onClick={handleSubmit} disabled={saving || !amount}>
        {saving ? "Сохраняем…" : "Внести операцию"}
      </button>
    </div>
  );
}
