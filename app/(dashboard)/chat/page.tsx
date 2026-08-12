"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import Modal from "@/components/Modal";
import { ROLE_LABELS, type Role } from "@/lib/domain";
import { uploadFile } from "@/lib/upload-client";

interface UserDTO {
  id: string;
  name: string;
  role: Role;
  branch?: { name: string } | null;
}
interface GroupDTO {
  id: string;
  name: string;
  members: { user: UserDTO }[];
}
interface MessageDTO {
  id: string;
  senderId: string;
  sender: UserDTO;
  text: string | null;
  attachmentUrl: string | null;
  createdAt: string;
}

type Selection = { type: "user"; id: string; name: string } | { type: "group"; id: string; name: string } | null;

export default function ChatPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<UserDTO[]>([]);
  const [groups, setGroups] = useState<GroupDTO[]>([]);
  const [selection, setSelection] = useState<Selection>(null);
  const [messages, setMessages] = useState<MessageDTO[]>([]);
  const [text, setText] = useState("");
  const [showNewGroup, setShowNewGroup] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    const res = await fetch("/api/chat/conversations");
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users);
      setGroups(data.groups);
    }
  }, []);

  const loadMessages = useCallback(async () => {
    if (!selection) return;
    const params = selection.type === "user" ? `userId=${selection.id}` : `groupId=${selection.id}`;
    const res = await fetch(`/api/chat/messages?${params}`);
    if (res.ok) setMessages(await res.json());
  }, [selection]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    loadMessages();
    const id = setInterval(loadMessages, 4000); // простой long-poll-заменитель реального времени
    return () => clearInterval(id);
  }, [loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    if (!text.trim() || !selection) return;
    const payload =
      selection.type === "user" ? { text, receiverId: selection.id } : { text, groupId: selection.id };
    setText("");
    const res = await fetch("/api/chat/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) loadMessages();
  }

  async function handleAttach(file: File) {
    if (!selection) return;
    let url: string;
    try {
      url = await uploadFile(file);
    } catch {
      return;
    }
    const payload =
      selection.type === "user" ? { attachmentUrl: url, receiverId: selection.id } : { attachmentUrl: url, groupId: selection.id };
    await fetch("/api/chat/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    loadMessages();
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4 md:h-[calc(100vh-4rem)]">
      <div className="card flex w-64 shrink-0 flex-col overflow-y-auto">
        <div className="flex items-center justify-between border-b border-surface-border p-3">
          <h3 className="text-sm font-semibold text-text">Беседы</h3>
          <button className="text-xs font-medium text-accent" onClick={() => setShowNewGroup(true)}>
            + Группа
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {groups.length > 0 && (
            <div>
              <p className="px-3 pt-2 text-xs font-semibold uppercase text-text-muted">Группы</p>
              {groups.map((g) => (
                <ConvItem
                  key={g.id}
                  label={g.name}
                  active={selection?.type === "group" && selection.id === g.id}
                  onClick={() => setSelection({ type: "group", id: g.id, name: g.name })}
                />
              ))}
            </div>
          )}
          <p className="px-3 pt-2 text-xs font-semibold uppercase text-text-muted">Сотрудники</p>
          {users.map((u) => (
            <ConvItem
              key={u.id}
              label={u.name}
              sub={u.branch ? `${ROLE_LABELS[u.role]} · ${u.branch.name}` : ROLE_LABELS[u.role]}
              active={selection?.type === "user" && selection.id === u.id}
              onClick={() => setSelection({ type: "user", id: u.id, name: u.name })}
            />
          ))}
        </div>
      </div>

      <div className="card flex flex-1 flex-col">
        {!selection ? (
          <div className="flex flex-1 items-center justify-center text-text-muted">Выберите беседу слева</div>
        ) : (
          <>
            <div className="border-b border-surface-border p-3">
              <p className="text-sm font-semibold text-text">{selection.name}</p>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-3">
              {messages.map((m) => {
                const mine = m.senderId === session?.user?.id;
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-xs rounded-2xl px-3 py-2 text-sm ${
                        mine ? "bg-accent text-white" : "bg-surface text-text"
                      }`}
                    >
                      {!mine && selection.type === "group" && (
                        <p className="mb-0.5 text-xs font-semibold opacity-70">{m.sender.name}</p>
                      )}
                      {m.text && <p>{m.text}</p>}
                      {m.attachmentUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.attachmentUrl} alt="вложение" className="mt-1 max-h-48 rounded-lg" />
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
            <div className="flex items-center gap-2 border-t border-surface-border p-3">
              <label className="btn-secondary cursor-pointer text-lg">
                📎
                <input
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={(e) => e.target.files && handleAttach(e.target.files[0])}
                />
              </label>
              <input
                className="input"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Сообщение…"
              />
              <button className="btn-primary" onClick={handleSend}>
                Отправить
              </button>
            </div>
          </>
        )}
      </div>

      <Modal open={showNewGroup} onClose={() => setShowNewGroup(false)} title="Новая группа">
        <NewGroupForm
          users={users}
          onDone={() => {
            setShowNewGroup(false);
            loadConversations();
          }}
        />
      </Modal>
    </div>
  );
}

function ConvItem({
  label,
  sub,
  active,
  onClick,
}: {
  label: string;
  sub?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-surface ${
        active ? "bg-accent-light" : ""
      }`}
    >
      <span className="font-medium text-text">{label}</span>
      {sub && <span className="text-xs text-text-muted">{sub}</span>}
    </button>
  );
}

function NewGroupForm({ users, onDone }: { users: UserDTO[]; onDone: () => void }) {
  const [name, setName] = useState("");
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  function toggle(id: string) {
    setMemberIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleSubmit() {
    setSaving(true);
    await fetch("/api/chat/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, memberIds }),
    });
    setSaving(false);
    onDone();
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="field-label">Название группы</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label className="field-label">Участники</label>
        <div className="max-h-48 space-y-1 overflow-y-auto">
          {users.map((u) => (
            <label key={u.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={memberIds.includes(u.id)} onChange={() => toggle(u.id)} />
              {u.name}
            </label>
          ))}
        </div>
      </div>
      <button className="btn-primary" onClick={handleSubmit} disabled={saving || !name || memberIds.length === 0}>
        {saving ? "Создаём…" : "Создать группу"}
      </button>
    </div>
  );
}
