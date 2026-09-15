"use client";

import Link from "next/link";
import { PointerEvent, useEffect, useRef, useState } from "react";
import type { Tool } from "@/lib/tools";

const DRAG_PX = 8;

export function ToolCardGrid({
  tools,
  editing,
  onSwap,
}: {
  tools: Tool[];
  editing: boolean;
  onSwap: (from: string, to: string) => void;
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const drag = useRef<{ id: string; x: number; y: number; active: boolean } | null>(null);

  function targetId(x: number, y: number) {
    const el = document.elementFromPoint(x, y)?.closest("[data-tool-id]");
    return el instanceof HTMLElement ? el.dataset.toolId || null : null;
  }

  function onPointerDown(e: PointerEvent<HTMLLIElement>, id: string) {
    if (!editing || e.button !== 0) return;
    drag.current = { id, x: e.clientX, y: e.clientY, active: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: PointerEvent<HTMLLIElement>) {
    if (!editing) return;
    const rec = drag.current;
    if (!rec) return;
    const dist = Math.hypot(e.clientX - rec.x, e.clientY - rec.y);
    if (!rec.active && dist >= DRAG_PX) {
      rec.active = true;
      setDraggingId(rec.id);
    }
    if (!rec.active) return;
    e.preventDefault();
    const over = targetId(e.clientX, e.clientY);
    setOverId(over && over !== rec.id ? over : null);
  }

  function onPointerUp(e: PointerEvent<HTMLLIElement>) {
    const rec = drag.current;
    drag.current = null;
    if (editing && rec?.active) {
      const to = targetId(e.clientX, e.clientY);
      if (to) onSwap(rec.id, to);
    }
    setDraggingId(null);
    setOverId(null);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // already released
    }
  }

  useEffect(() => {
    if (!draggingId) return;
    const block = (ev: TouchEvent) => ev.preventDefault();
    document.addEventListener("touchmove", block, { passive: false });
    return () => document.removeEventListener("touchmove", block);
  }, [draggingId]);

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {tools.map((tool) => {
        const dragging = draggingId === tool.id;
        const over = overId === tool.id;
        const cardClass = `block h-full rounded-2xl border bg-white p-5 shadow-sm transition ${
          over
            ? "border-teal-600 ring-2 ring-teal-700"
            : dragging
              ? "border-zinc-200 opacity-50"
              : "border-zinc-200 hover:-translate-y-0.5 hover:border-teal-600 hover:shadow-md"
        }`;
        const body = (
          <>
            <p className="text-xs font-medium uppercase tracking-wider text-teal-700">{tool.kicker}</p>
            <h3 className="mt-2 text-lg font-semibold">{tool.name}</h3>
            <p className="mt-2 text-sm leading-6 text-zinc-500">{tool.description}</p>
          </>
        );
        return (
          <li
            key={tool.id}
            data-tool-id={tool.id}
            onPointerDown={(e) => onPointerDown(e, tool.id)}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className={editing ? `select-none ${dragging ? "cursor-grabbing" : "cursor-grab"}` : undefined}
          >
            {editing ? (
              <div className={cardClass}>{body}</div>
            ) : (
              <Link href={tool.href} className={cardClass}>
                {body}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
