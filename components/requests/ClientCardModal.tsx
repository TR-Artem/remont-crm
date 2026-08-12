"use client";

import { useState, useEffect } from "react";
import type { RequestDTO, AdSourceDTO, MasterDTO } from "@/types";
import {
  STATUSES,
  STATUS_LABELS,
  STATUS_COLORS,
  CLOSING_STATUSES,
  EDIT_WINDOW_MS,
  CLOSE_EDIT_WINDOW_MS,
  type Role,
} from "@/lib/domain";
import EditWindowBadge from "@/components/EditWindowBadge";

/** Текущее время как состояние, обновляемое через эффект — не вызываем Date.now() напрямую в теле рендера. */
function useNow(intervalMs = 30000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

const NON_CLOSING_STATUSES = STATUSES.filter((s) => !CLOSING_STATUSES.includes(s));

export default function ClientCardModal({
  request,
  sources,
  masters,
  role,
  onClose,
  onSaved,
  onRequestCloseFlow,
}: {
  request: RequestDTO | null; // null = создание новой заявки
  sources: AdSourceDTO[];
  masters: MasterDTO[];
  role: Role;
  onClose: () => void;
  onSaved: () => void;
  onRequestCloseFlow: (req: RequestDTO) => void;
}) {
  const isCreate = request === null;
  const [clientName, setClientName] = useState(request?.clientName ?? "");
  const [phone, setPhone] = useState(request?.phone ?? "");
  const [address, setAddress] = useState(request?.address ?? "");
  const [reason, setReason] = useState(request?.reason ?? "");
  const [sourceId, setSourceId] = useState(request?.sourceId ?? "");
  const [assignedMasterId, setAssignedMasterId] = useState(request?.assignedMasterId ?? "");
  const [visitDatetime, setVisitDatetime] = useState(
    request?.visitDatetime ? request.visitDatetime.slice(0, 16) : ""
  );
  const [status, setStatus] = useState(request?.status ?? "waiting");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const now = useNow();

  const createdAt = request ? new Date(request.createdAt) : null;
  const basicFieldsEditable =
    isCreate ||
    role === "director" ||
    role === "regional_director" ||
    (role === "callcenter" && !request!.closedAt && now - createdAt!.getTime() < EDIT_WINDOW_MS);
  const isClosed = !!request?.closedAt;
  const canEditSource = isCreate || role === "callcenter" || !isClosed;

  async function handleSave() {
    setError(null);
    setSaving(true);
    try {
      if (isCreate) {
        const res = await fetch("/api/requests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientName,
            phone,
            address,
            reason,
            sourceId,
            assignedMasterId: assignedMasterId || null,
            visitDatetime: visitDatetime || null,
          }),
        });
        if (!res.ok) throw new Error((await res.json()).error?.formErrors?.join(", ") || "Не удалось создать заявку");
      } else {
        const res = await fetch(`/api/requests/${request!.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...(basicFieldsEditable ? { clientName, phone, address, reason } : {}),
            assignedMasterId: assignedMasterId || null,
            visitDatetime: visitDatetime || null,
            sourceId,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error?.formErrors?.join(", ") || data.error || "Не удалось сохранить");
        }
        // Статус мог быть изменён через пилюлю-селект отдельно от остальных полей
        if (status !== request!.status && !CLOSING_STATUSES.includes(status)) {
          const statusRes = await fetch(`/api/requests/${request!.id}/status`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
          });
          if (!statusRes.ok) throw new Error((await statusRes.json()).error || "Не удалось изменить статус");
        }
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  }

  async function handleMoveNext() {
    if (!request) return;
    const idx = NON_CLOSING_STATUSES.indexOf(request.status as (typeof NON_CLOSING_STATUSES)[number]);
    if (idx === -1 || idx === NON_CLOSING_STATUSES.length - 1) return;
    const next = NON_CLOSING_STATUSES[idx + 1];
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/requests/${request.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Не удалось изменить статус");
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  }

  const canClose = !isCreate && !isClosed && ["admin", "director", "regional_director"].includes(role);
  const canMoveStatus = !isCreate && !isClosed && ["callcenter", "admin", "director", "regional_director"].includes(role);
  const closeEditWindowOpen =
    isClosed &&
    request?.closedAt &&
    (role === "director" || role === "regional_director") &&
    now - new Date(request.closedAt).getTime() < CLOSE_EDIT_WINDOW_MS;

  const statusColor = STATUS_COLORS[isClosed ? (request!.closeStatus === "refused" ? "refused" : "done") : status];

  return (
    <div className="space-y-5">
      {!isCreate && (
        <div className="flex flex-wrap items-center gap-2 border-b border-surface-border pb-4">
          <span className="pill" style={{ backgroundColor: statusColor.bg, color: statusColor.text }}>
            {isClosed ? STATUS_LABELS[request!.closeStatus === "refused" ? "refused" : "done"] : STATUS_LABELS[status]}
          </span>
          {isClosed ? (
            closeEditWindowOpen ? (
              <EditWindowBadge
                deadline={new Date(new Date(request!.closedAt!).getTime() + CLOSE_EDIT_WINDOW_MS)}
                availableLabel="Осталось на правку:"
                expiredLabel="Окно на правку истекло"
              />
            ) : (
              <span className="pill" style={{ backgroundColor: "#F0F1F4", color: "#6B7280" }}>
                Правка недоступна
              </span>
            )
          ) : role === "callcenter" ? (
            <EditWindowBadge deadline={new Date(createdAt!.getTime() + EDIT_WINDOW_MS)} />
          ) : null}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label">Имя клиента</label>
          <input
            className="field-value"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            disabled={!basicFieldsEditable}
            required
          />
        </div>
        <div>
          <label className="field-label">Телефон</label>
          <div className="flex items-center gap-2">
            <input
              className="field-value"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={!basicFieldsEditable}
              required
            />
            {phone && (
              <a href={`tel:${phone}`} className="btn-primary shrink-0 text-xs" title="Позвонить">
                📞 Позвонить
              </a>
            )}
          </div>
        </div>
      </div>

      <div>
        <label className="field-label">Адрес</label>
        <input
          className="field-value"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          disabled={!basicFieldsEditable}
          required
        />
      </div>

      <div>
        <label className="field-label">Причина звонка / описание проблемы</label>
        <textarea
          className="input mt-1 bg-surface"
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={!basicFieldsEditable}
          required
        />
        {!basicFieldsEditable && !isCreate && (
          <p className="mt-1 text-xs text-text-muted">Правка недоступна — прошло более 24 часов с момента создания заявки.</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label">Дата и время выезда мастера</label>
          <input
            type="datetime-local"
            className="field-value"
            value={visitDatetime}
            onChange={(e) => setVisitDatetime(e.target.value)}
            disabled={isClosed}
          />
        </div>
        {!isCreate && (
          <div>
            <label className="field-label">Статус заявки</label>
            <select
              className="pill-select"
              style={{ backgroundColor: statusColor.bg, color: statusColor.text }}
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
              disabled={isClosed || !canMoveStatus}
            >
              {NON_CLOSING_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-text-muted">
              {STATUSES.map((s) => STATUS_LABELS[s]).join(" · ").toLowerCase()}
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label">Назначенный мастер</label>
          <select className="field-value" value={assignedMasterId} onChange={(e) => setAssignedMasterId(e.target.value)} disabled={isClosed}>
            <option value="">— не назначен —</option>
            {masters.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label">По какой рекламе звонят</label>
          <select
            className="pill-select"
            style={{ backgroundColor: "#FFF4DE", color: "#B8860B" }}
            value={sourceId}
            onChange={(e) => setSourceId(e.target.value)}
            disabled={!canEditSource}
            required
          >
            <option value="">— выберите источник —</option>
            {sources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          {role === "callcenter" && (
            <p className="mt-1 text-xs text-text-muted">список готовых вариантов, вносит администратор</p>
          )}
        </div>
      </div>

      {isClosed && (
        <div className="rounded-btn bg-surface p-3 text-sm">
          <p className="field-label mb-2">Закрытие заявки</p>
          {request!.closeStatus === "refused" ? (
            <p className="text-text-secondary">Причина отказа: {request!.refusalReason ?? "не указана"}</p>
          ) : (
            <div className="flex flex-wrap gap-4 text-text-secondary">
              <span>Сумма: {request!.amountFull?.toLocaleString("ru-RU")} ₽</span>
              <span>В кассу: {request!.amountRecorded?.toLocaleString("ru-RU")} ₽</span>
            </div>
          )}
          {request!.documents.length > 0 && (
            <div className="mt-3">
              <p className="field-label mb-1">Фото документов</p>
              <div className="flex flex-wrap gap-2">
                {request!.documents.map((d) => (
                  <a key={d.id} href={d.fileUrl} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={d.fileUrl}
                      alt="Документ"
                      className="h-20 w-20 rounded-btn border border-surface-border object-cover transition-opacity hover:opacity-80"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {error && <div className="rounded-btn bg-danger-light px-3 py-2 text-sm text-danger">{error}</div>}

      <div className="flex flex-wrap gap-2 pt-1">
        <button className="btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? "Сохраняем…" : "Сохранить"}
        </button>
        {canMoveStatus && (
          <button className="btn-secondary" onClick={handleMoveNext} disabled={saving}>
            Передвинуть →
          </button>
        )}
        {canClose && (
          <button className="btn-danger" onClick={() => onRequestCloseFlow(request!)}>
            Закрыть заявку
          </button>
        )}
        {closeEditWindowOpen && (
          <button className="btn-secondary" onClick={() => onRequestCloseFlow(request!)}>
            Изменить закрытие
          </button>
        )}
      </div>

      {!isCreate && (role === "callcenter" || role === "master") && (
        <div className="space-y-0.5 border-t border-surface-border pt-3 text-xs text-text-muted">
          <p>Колл-центр может менять имя, адрес и причину звонка только первые 24 часа после создания заявки</p>
          <p>Доступ: только карточка клиента, без доступа к рекламе и бухгалтерии</p>
        </div>
      )}
    </div>
  );
}
