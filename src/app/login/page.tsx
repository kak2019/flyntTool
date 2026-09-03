"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/";
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error || "登录失败");
        return;
      }
      router.push(next.startsWith("/") ? next : "/");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
      >
        <p className="text-sm font-medium text-teal-700">Flynt Tools</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">输入密码</h1>
        <p className="mt-2 text-sm text-zinc-500">这是给自己用的工具站，进去需要密码。</p>

        <label className="mt-6 block text-sm font-medium text-zinc-700">
          密码
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            className="mt-1.5 w-full rounded-xl border border-zinc-200 px-3 py-2 outline-none ring-teal-700/30 focus:border-teal-700 focus:ring-2"
          />
        </label>

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

        <button
          type="submit"
          disabled={pending || !password}
          className="mt-5 w-full rounded-xl bg-teal-700 px-3 py-2.5 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-50"
        >
          {pending ? "正在进入…" : "进入"}
        </button>
      </form>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center text-zinc-500">
          加载中…
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
