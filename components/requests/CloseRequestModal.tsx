"use client";

import { useState } from "react";
import type { RequestDTO } from "@/types";
import { REFUSAL_REASONS } from "@/lib/domain";
import { uploadFile } from "@/lib/upload-client";

const DEFAULT_MASTER_PERCENT = 50;

export default function CloseRequestModal({
  request,
  initialStatus,
  editMode,
  onClose,
  onSaved,
}: {
  request: RequestDTO;
  initialStatus?: "done" | "refused";
  editMode?: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [closeStatus, setCloseStatus] = useState<"done" | "refused">(
    initialStatus ?? (request.closeStatus as "done" | "refused" | null) ?? "done"
  );
  const [amountFull, setAmountFull] = useState<string>(request.amountFull?.toString() ?? "");
  const [masterPercent, setMasterPercent] = useState<number>(request.masterPercent ?? DEFAULT_MASTER_PERCENT);
  const [refusalReason, setRefusalReason] = useState(request.refusalReason ?? "");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amountNum = parseFloat(amountFull || "0");
  const companyShare = Math.floor((amountNum * (100 - masterPercent)) / 100);
  const masterShare = Math.floor((amountNum * masterPercent) / 100);

  async function uploadFiles(): Promise<string[]> {
    const urls: string[] = [];
    for (const file of files) {
      const url = await uploadFile(file);
      urls.push(url);
    }
    return urls;
  }

  async function handleSubmit() {
    setError(null);
    setUploading(true);
    try {
      const documentUrls = files.length > 0 ? await uploadFiles() : undefined;

      const payload: Record<string, unknown> = {
        closeStatus,
        ...(closeStatus === "done" ? { amountFull: amountNum, masterPercent } : {}),
        ...(closeStatus === "refused" ? { refusalReason } : {}),
        ...(documentUrls ? { documentUrls } : {}),
      };

      const res = await fetch(`/api/requests/${request.id}/close`, {
        method: editMode ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        const msg =
          data.error?.formErrors?.join(", ") ||
          Object.values(data.error?.fieldErrors ?? {}).flat().join(", ") ||
          data.error ||
          "Не удалось закрыть заявку";
        throw new Error(msg);
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-btn bg-surface p-3 text-sm text-text-secondary">
        <span className="font-medium text-text">{request.clientName}</span> · {request.address}
        {request.reason && <> · {request.reason}</>}
      </div>

      <div>
        <label className="field-label">Статус закрытия</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setCloseStatus("done")}
            className="flex-1 rounded-btn border px-3 py-2 text-sm font-semibold transition-colors"
            style={
              closeStatus === "done"
                ? { backgroundColor: "#E5F8EE", color: "#1CA05C", borderColor: "#1CA05C" }
                : { backgroundColor: "white", color: "#6B7280", borderColor: "#E2E5EC" }
            }
          >
            ✓ Готово
          </button>
          <button
            type="button"
            onClick={() => setCloseStatus("refused")}
            className="flex-1 rounded-btn border px-3 py-2 text-sm font-semibold transition-colors"
            style={
              closeStatus === "refused"
                ? { backgroundColor: "#FDEAEA", color: "#DC2626", borderColor: "#DC2626" }
                : { backgroundColor: "white", color: "#6B7280", borderColor: "#E2E5EC" }
            }
          >
            или «Отказ»
          </button>
        </div>
      </div>

      {closeStatus === "done" ? (
        <>
          <div>
            <label className="field-label">Сумма закрытия заявки (полная, ₽)</label>
            <input
              type="number"
              min={0}
              className="input"
              value={amountFull}
              onChange={(e) => setAmountFull(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="field-label">Процент мастеру ({masterPercent}%) / фирме ({100 - masterPercent}%)</label>
            <input
              type="range"
              min={0}
              max={100}
              value={masterPercent}
              onChange={(e) => setMasterPercent(Number(e.target.value))}
              className="w-full"
            />
          </div>
          {amountNum > 0 && (
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-btn bg-success-light p-2 text-success">В кассу (фирма): {companyShare} ₽</div>
              <div className="rounded-btn p-2" style={{ backgroundColor: "#E9E4FF", color: "#6D3FE0" }}>
                Мастеру: {masterShare} ₽
              </div>
            </div>
          )}
          <div>
            <label className="field-label">Фото документов (чек / акт) {editMode ? "" : "— обязательно"}</label>
            <div className="flex flex-wrap gap-2">
              {request.documents.map((d) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={d.id} src={d.fileUrl} alt="" className="h-16 w-16 rounded-btn border border-surface-border object-cover" />
              ))}
              {files.map((f, i) => (
                <div
                  key={i}
                  className="flex h-16 w-16 items-center justify-center rounded-btn border border-accent/30 bg-accent-light text-xs text-accent"
                >
                  📎
                </div>
              ))}
              <label className="flex h-16 w-16 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-btn border border-dashed border-surface-border text-xs text-text-muted hover:border-accent hover:text-accent">
                <span>+</span>
                <span>Добавить</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => setFiles((prev) => [...prev, ...Array.from(e.target.files ?? [])])}
                />
              </label>
            </div>
          </div>
        </>
      ) : (
        <div>
          <label className="field-label">Причина отказа</label>
          <select className="input" value={refusalReason} onChange={(e) => setRefusalReason(e.target.value)} required>
            <option value="">— выберите причину —</option>
            {REFUSAL_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      )}

      {closeStatus === "done" && (
        <div className="rounded-btn bg-warning-light p-3 text-xs text-warning">
          <p className="font-semibold">⏱ Окно на правку данных — 1 час</p>
          <p className="mt-0.5 text-text-secondary">
            После закрытия сумму и статус может изменить директор или региональный директор — не позднее часа с момента закрытия.
          </p>
        </div>
      )}

      {error && <div className="rounded-btn bg-danger-light px-3 py-2 text-sm text-danger">{error}</div>}

      <div className="flex gap-2 pt-2">
        <button
          className="btn-primary"
          onClick={handleSubmit}
          disabled={
            uploading ||
            (closeStatus === "done" && (!amountFull || (!editMode && request.documents.length === 0 && files.length === 0))) ||
            (closeStatus === "refused" && !refusalReason)
          }
        >
          {uploading ? "Сохраняем…" : editMode ? "Сохранить правку" : "Закрыть заявку"}
        </button>
        <button className="btn-secondary" onClick={onClose}>
          Отмена
        </button>
      </div>

      <p className="text-xs text-text-muted">
        Закрывают заявку администраторы. Правка после закрытия — только директор / региональный директор, в течение 1 часа.
      </p>
    </div>
  );
}
