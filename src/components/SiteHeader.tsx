"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { toolCategories, toolsIn } from "@/lib/tools";

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const navRef = useRef<HTMLElement>(null);

  function closeMenus() {
    navRef.current?.querySelectorAll("details[open]").forEach((el) => {
      el.removeAttribute("open");
    });
  }

  useEffect(() => {
    closeMenus();
  }, [pathname]);

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      const opened = navRef.current?.querySelector("details[open]");
      if (!opened) return;
      if (opened.contains(e.target as Node)) return;
      opened.removeAttribute("open");
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeMenus();
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

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
        <nav ref={navRef} className="flex min-w-0 flex-1 items-center gap-1 text-sm">
          {toolCategories.map((category) => {
            const items = toolsIn(category.id);
            const active = items.some((tool) => pathname.startsWith(tool.href));
            return (
              <details key={category.id} name="tools-nav" className="relative">
                <summary
                  className={`flex cursor-pointer list-none items-center gap-1 rounded-lg px-2.5 py-1 marker:content-none [&::-webkit-details-marker]:hidden ${
                    active
                      ? "bg-teal-50 font-medium text-teal-800"
                      : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800"
                  }`}
                >
                  {category.name}
                  <span className="text-[10px] leading-none text-zinc-400" aria-hidden>
                    ▾
                  </span>
                </summary>
                <div
                  className="absolute left-0 top-full z-30 mt-1 min-w-40 rounded-xl border border-zinc-200 bg-white py-1 shadow-lg"
                  onClick={(e) => {
                    if (e.target === e.currentTarget) closeMenus();
                  }}
                >
                  {items.map((tool) => {
                    const current = pathname.startsWith(tool.href);
                    return (
                      <Link
                        key={tool.id}
                        href={tool.href}
                        onClick={closeMenus}
                        className={`block px-3 py-1.5 ${
                          current
                            ? "bg-teal-50 font-medium text-teal-800"
                            : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                        }`}
                      >
                        {tool.name}
                      </Link>
                    );
                  })}
                </div>
              </details>
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
