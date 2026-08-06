"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import { ROLES, ROLE_LABELS, type Role } from "@/lib/domain";

interface EmployeeDTO {
  id: string;
  name: string;
  login: string;
  role: Role;
  branch: { name: string } | null;
  createdAt: string;
}
interface BranchDTO {
  id: string;
  name: string;
}

export default function EmployeesPage() {
  const { data: session } = useSession();
  const role = session?.user?.role as Role | undefined;
  const isDirector = role === "director";

  const [employees, setEmployees] = useState<EmployeeDTO[]>([]);
  const [branches, setBranches] = useState<BranchDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showAddBranch, setShowAddBranch] = useState(false);

  const load = useCallback(async () => {
    const [empRes, branchRes] = await Promise.all([fetch("/api/employees"), fetch("/api/branches")]);
    if (empRes.ok) setEmployees(await empRes.json());
    if (branchRes.ok) setBranches(await branchRes.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <PageHeader
          title="Сотрудники"
          action={
            <button className="btn-primary" onClick={() => setShowAdd(true)}>
              + Новый сотрудник
            </button>
          }
        />

        {loading ? (
          <p className="text-text-secondary">Загрузка…</p>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border text-left text-text-secondary">
                  <th className="p-3">Имя</th>
                  <th className="p-3">Логин</th>
                  <th className="p-3">Роль</th>
                  <th className="p-3">Филиал</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((e) => (
                  <tr key={e.id} className="border-b border-surface-border last:border-0">
                    <td className="p-3">{e.name}</td>
                    <td className="p-3 text-text-secondary">{e.login}</td>
                    <td className="p-3">{ROLE_LABELS[e.role]}</td>
                    <td className="p-3 text-text-secondary">{e.branch?.name ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-text">Филиалы</h2>
          {isDirector && (
            <button className="btn-secondary text-xs" onClick={() => setShowAddBranch(true)}>
              + Новый филиал
            </button>
          )}
        </div>
        {branches.length === 0 ? (
          <p className="text-sm text-text-secondary">Филиалов пока нет.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {branches.map((b) => (
              <span key={b.id} className="pill" style={{ backgroundColor: "#E7F0FF", color: "#2F6FED" }}>
                {b.name}
              </span>
            ))}
          </div>
        )}
        {!isDirector && (
          <p className="mt-2 text-xs text-text-muted">Добавлять новые филиалы может только директор.</p>
        )}
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Новый сотрудник">
        <EmployeeForm
          branches={branches}
          onDone={() => {
            setShowAdd(false);
            load();
          }}
        />
      </Modal>

      <Modal open={showAddBranch} onClose={() => setShowAddBranch(false)} title="Новый филиал">
        <BranchForm
          onDone={() => {
            setShowAddBranch(false);
            load();
          }}
        />
      </Modal>
    </div>
  );
}

function BranchForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.formErrors?.join(", ") || data.error || "Не удалось создать филиал");
      }
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
        <label className="field-label">Название филиала</label>
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="например, Казань"
          autoFocus
        />
      </div>
      {error && <div className="rounded-btn bg-danger-light px-3 py-2 text-sm text-danger">{error}</div>}
      <button className="btn-primary" onClick={handleSubmit} disabled={saving || !name.trim()}>
        {saving ? "Создаём…" : "Создать филиал"}
      </button>
    </div>
  );
}

function EmployeeForm({ branches, onDone }: { branches: BranchDTO[]; onDone: () => void }) {
  const [name, setName] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("master");
  const [branchId, setBranchId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, login, password, role, branchId: branchId || null }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Не удалось создать сотрудника");
      }
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
        <label className="field-label">Имя</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="field-label">Логин</label>
          <input className="input" value={login} onChange={(e) => setLogin(e.target.value)} />
        </div>
        <div>
          <label className="field-label">Пароль</label>
          <input type="text" className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="мин. 6 символов" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="field-label">Роль</label>
          <select className="input" value={role} onChange={(e) => setRole(e.target.value as Role)}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label">Филиал</label>
          <select className="input" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
            <option value="">— без филиала —</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      {error && <div className="rounded-btn bg-danger-light px-3 py-2 text-sm text-danger">{error}</div>}
      <button className="btn-primary" onClick={handleSubmit} disabled={saving || !name || !login || password.length < 6}>
        {saving ? "Создаём…" : "Создать сотрудника"}
      </button>
    </div>
  );
}
