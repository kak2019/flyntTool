"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { tools } from "@/lib/tools";

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
        <Link href="/" className="shrink-0 font-semibold tracking-tight text-zinc-900">
          Flynt Tools
        </Link>
        <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto text-sm">
          {tools.map((tool) => {
            const active = pathname.startsWith(tool.href);
            return (
              <Link
                key={tool.id}
                href={tool.href}
                className={`shrink-0 rounded-lg px-2.5 py-1 ${
                  active
                    ? "bg-teal-50 font-medium text-teal-800"
                    : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800"
                }`}
              >
                {tool.name}
              </Link>
            );
          })}
        </nav>
        <button
          type="button"
          onClick={logout}
          className="shrink-0 text-sm text-zinc-500 hover:text-zinc-800"
        >
          退出
        </button>
      </div>
    </header>
  );
}
