"use client";

import { useEffect, useState } from "react";

interface BranchDTO {
  id: string;
  name: string;
}

/** Выпадающий список филиалов — показывать только тем ролям, которым доступен просмотр по всем точкам (директор). */
export default function BranchSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (branchId: string) => void;
}) {
  const [branches, setBranches] = useState<BranchDTO[]>([]);

  useEffect(() => {
    fetch("/api/branches")
      .then((res) => (res.ok ? res.json() : []))
      .then(setBranches)
      .catch(() => {});
  }, []);

  if (branches.length === 0) return null;

  return (
    <div>
      <label className="field-label">Филиал</label>
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Все филиалы</option>
        {branches.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>
    </div>
  );
}
