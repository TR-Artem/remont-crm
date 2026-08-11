"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await signIn("credentials", { login, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError("Неверный логин или пароль");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-card bg-sidebar text-xl font-bold text-white">
            Р
          </div>
          <h1 className="text-2xl font-semibold text-text">РемонтCRM</h1>
          <p className="mt-1 text-sm text-text-secondary">Войдите, чтобы продолжить</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4 p-6">
          <div>
            <label className="field-label">Логин</label>
            <input
              className="input"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              placeholder="например, callcenter"
              autoFocus
              required
            />
          </div>
          <div>
            <label className="field-label">Пароль</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && (
            <div className="rounded-btn bg-danger-light px-3 py-2 text-sm text-danger">{error}</div>
          )}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "Входим…" : "Войти"}
          </button>
        </form>
      </div>
    </div>
  );
}
