"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { DEMO_PASSWORDS } from "@/prisma/demo-passwords";

const DEMO_ACCOUNTS = [
  { login: "callcenter", role: "Колл-центр" },
  { login: "master1", role: "Мастер" },
  { login: "director", role: "Директор" },
];

export default function LoginPage() {
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await doLogin(login, password);
  }

  async function doLogin(loginValue: string, passwordValue: string) {
    setError(null);
    setLoading(true);
    const res = await signIn("credentials", {
      login: loginValue,
      password: passwordValue,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("Неверный логин или пароль");
      return;
    }
    router.push("/");
    router.refresh();
  }

  function handleDemoLogin(account: (typeof DEMO_ACCOUNTS)[number]) {
    const demoPassword = DEMO_PASSWORDS[account.login] ?? "";
    setLogin(account.login);
    setPassword(demoPassword);
    void doLogin(account.login, demoPassword);
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

        <div className="card mt-4 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Демо-доступы
          </p>
          <p className="mt-1 text-xs text-text-secondary">
            Один клик — и вы в системе под выбранной ролью. Заявки, касса и реклама уже
            заполнены тестовыми данными.
          </p>
          <div className="mt-3 grid gap-2">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.login}
                type="button"
                disabled={loading}
                onClick={() => handleDemoLogin(account)}
                className="flex items-center justify-between rounded-btn border border-border bg-white px-3 py-2 text-left text-sm text-text hover:border-accent hover:bg-accent-light disabled:opacity-60"
              >
                <span className="font-medium">Войти как {account.role.toLowerCase()}</span>
                <span className="text-xs text-text-muted">{account.login}</span>
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-text-muted">
            Пароли демо-аккаунтов открыты в <code>prisma/demo-passwords.ts</code>.
          </p>
        </div>

        <p className="mt-4 text-center text-xs text-text-muted">
          Демо-проект · данные вымышленные ·{" "}
          <a
            href="https://github.com/TR-Artem/remont-crm"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-text-secondary"
          >
            исходный код на GitHub
          </a>
        </p>
      </div>
    </div>
  );
}
