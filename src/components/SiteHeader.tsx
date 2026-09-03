"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getTool, tools } from "@/lib/tools";

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const current = tools.find((t) => pathname.startsWith(t.href));
  const tool = current ?? (pathname.startsWith("/tools/") ? getTool(pathname.split("/")[2] ?? "") : undefined);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/" className="shrink-0 font-semibold tracking-tight text-zinc-900">
            Flynt Tools
          </Link>
          {tool ? (
            <>
              <span className="text-zinc-300">/</span>
              <span className="truncate text-sm text-zinc-500">{tool.name}</span>
            </>
          ) : null}
        </div>
        <button
          type="button"
          onClick={logout}
          className="text-sm text-zinc-500 hover:text-zinc-800"
        >
          退出
        </button>
      </div>
    </header>
  );
}
