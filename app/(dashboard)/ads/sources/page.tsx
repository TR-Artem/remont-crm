"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import { AD_TYPES, AD_TYPE_LABELS, AD_TYPE_ICONS, AD_TYPE_COLORS, adTypeChannel, type AdType, type Role } from "@/lib/domain";
import type { AdSourceDTO } from "@/types";

export default function AdSourcesPage() {
  const { data: session } = useSession();
  const role = session?.user?.role as Role | undefined;
  const isAdmin = role === "admin";

  const [sources, setSources] = useState<AdSourceDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<AdSourceDTO | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/ad-sources");
    if (res.ok) setSources(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(id: string) {
    if (!confirm("Удалить источник? Если он уже используется в заявках, он будет архивирован вместо удаления.")) return;
    const res = await fetch(`/api/ad-sources/${id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  return (
    <div>
      <PageHeader
        title="Источники рекламы"
        action={
          isAdmin ? (
            <button className="btn-primary" onClick={() => setShowAdd(true)}>
              + Добавить источник
            </button>
          ) : undefined
        }
      />

      {loading ? (
        <p className="text-text-secondary">Загрузка…</p>
      ) : sources.length === 0 ? (
        <p className="text-text-secondary">Источников пока нет.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {sources.map((s) => {
            const color = AD_TYPE_COLORS[s.type];
            return (
              <div key={s.id} className="card p-4 text-center">
                {s.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={s.photoUrl}
                    alt={s.name}
                    className="mx-auto h-14 w-14 rounded-card object-cover"
                  />
                ) : (
                  <div
                    className="mx-auto flex h-14 w-14 items-center justify-center rounded-card text-2xl"
                    style={{ backgroundColor: color.bg }}
                  >
                    {AD_TYPE_ICONS[s.type]}
                  </div>
                )}
                <p className="mt-3 text-sm font-semibold text-text">{s.name}</p>
                <p className="mt-0.5 text-xs" style={{ color: color.text }}>
                  {adTypeChannel(s.type)} · добавлено{" "}
                  {new Date(s.createdAt).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" })}
                </p>
                {isAdmin && (
                  <div className="mt-3 flex gap-2">
                    <button className="btn-secondary flex-1 text-xs" onClick={() => setEditing(s)}>
                      Изменить
                    </button>
                    <button className="btn-danger flex-1 text-xs" onClick={() => handleDelete(s.id)}>
                      Удалить
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-4 text-xs text-text-muted">
        Доступ к разделу: Администратор (добавление и фото) · Директор, региональный директор, администратор (просмотр аналитики)
      </p>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Новый источник рекламы">
        <AdSourceForm
          onDone={() => {
            setShowAdd(false);
            load();
          }}
        />
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Редактирование источника">
        {editing && (
          <AdSourceForm
            source={editing}
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

function AdSourceForm({ source, onDone }: { source?: AdSourceDTO; onDone: () => void }) {
  const [name, setName] = useState(source?.name ?? "");
  const [type, setType] = useState<AdType>(source?.type ?? "avito");
  const [photoUrl, setPhotoUrl] = useState<string | null>(source?.photoUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    if (res.ok) {
      const data = await res.json();
      setPhotoUrl(data.url);
    }
    setUploading(false);
  }

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(source ? `/api/ad-sources/${source.id}` : "/api/ad-sources", {
        method: source ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type, photoUrl }),
      });
      if (!res.ok) throw new Error("Не удалось сохранить");
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
        <label className="field-label">Название источника</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Листовка, Александр" />
      </div>
      <div>
        <label className="field-label">Тип рекламы</label>
        <select className="input" value={type} onChange={(e) => setType(e.target.value as AdType)}>
          {AD_TYPES.map((t) => (
            <option key={t} value={t}>
              {AD_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="field-label">Фото рекламного материала</label>
        <input type="file" accept="image/*" className="input" onChange={(e) => e.target.files && handleFile(e.target.files[0])} />
        {photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt="" className="mt-2 h-24 rounded-btn object-cover" />
        )}
      </div>
      {error && <div className="rounded-btn bg-danger-light px-3 py-2 text-sm text-danger">{error}</div>}
      <button className="btn-primary" onClick={handleSubmit} disabled={saving || uploading || !name}>
        {saving ? "Сохраняем…" : "Добавить"}
      </button>
    </div>
  );
}
