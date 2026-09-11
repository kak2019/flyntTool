"use client";

import { FormEvent, useEffect, useState } from "react";
import { btnClass, fieldClass, primaryBtnClass } from "@/lib/styles";
import {
  formatYuan,
  pad2,
  parseTicketNums,
  type DltDraw,
  type DltHit,
  type DltTicket,
} from "@/lib/dlt-match";

type Payload = {
  latest: DltDraw | null;
  tickets: DltTicket[];
  hits: DltHit[];
  won: boolean;
  totalAmount: number;
  error?: string;
};

type Draft = {
  id: string;
  name: string;
  front: string;
  back: string;
  append: boolean;
  multiple: string;
};

function toDraft(ticket: DltTicket): Draft {
  return {
    id: ticket.id,
    name: ticket.name,
    front: ticket.front.map(pad2).join(" "),
    back: ticket.back.map(pad2).join(" "),
    append: ticket.append,
    multiple: String(ticket.multiple),
  };
}

function emptyDraft(index: number): Draft {
  return {
    id: `draft-${index}`,
    name: `注 ${index + 1}`,
    front: "",
    back: "",
    append: false,
    multiple: "1",
  };
}

function Balls({ nums, mark, tone }: { nums: number[]; mark?: number[]; tone: "front" | "back" }) {
  const hit = new Set(mark ?? []);
  const color = tone === "front" ? "bg-red-600" : "bg-sky-600";
  const dim = tone === "front" ? "bg-red-100 text-red-800" : "bg-sky-100 text-sky-800";
  return (
    <span className="inline-flex flex-wrap gap-1">
      {nums.map((n) => (
        <span
          key={`${tone}-${n}`}
          className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 text-xs font-medium ${
            hit.has(n) ? `${color} text-white` : dim
          }`}
        >
          {pad2(n)}
        </span>
      ))}
    </span>
  );
}

export function DltPanel() {
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState<Payload | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([emptyDraft(0), emptyDraft(1)]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);

  async function load(refresh = false) {
    const res = await fetch(refresh ? "/api/dlt?refresh=1" : "/api/dlt");
    const body = (await res.json()) as Payload;
    if (!res.ok) throw new Error(body.error || "读取失败");
    setPayload(body);
    if (body.error) setError(body.error);
    else setError("");
    if (body.tickets.length) setDrafts(body.tickets.map(toDraft));
    return body;
  }

  useEffect(() => {
    void load().catch((err) => setError(err instanceof Error ? err.message : "读取失败"));
  }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");
    try {
      const tickets = drafts.map((row) => ({
        id: row.id,
        name: row.name,
        front: parseTicketNums(row.front, 5, 35),
        back: parseTicketNums(row.back, 2, 12),
        append: row.append,
        multiple: Number(row.multiple) || 1,
      }));
      const res = await fetch("/api/dlt", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tickets }),
      });
      const body = (await res.json()) as Payload;
      if (!res.ok) throw new Error(body.error || "保存失败");
      setPayload((prev) => ({
        latest: body.latest ?? prev?.latest ?? null,
        tickets: body.tickets,
        hits: body.hits,
        won: body.won,
        totalAmount: body.totalAmount,
      }));
      setDrafts(body.tickets.map(toDraft));
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setPending(false);
    }
  }

  function updateDraft(index: number, patch: Partial<Draft>) {
    setDrafts((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  const latest = payload?.latest ?? null;
  const hits = payload?.hits ?? [];
  const won = Boolean(payload?.won);
  const showPanel = open;

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="px-1 text-sm tracking-[0.4em] text-zinc-300 hover:text-zinc-500"
        aria-expanded={showPanel}
        aria-label={showPanel ? "收起大乐透" : "展开大乐透"}
      >
        ···
      </button>

      {won && !open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-3 block w-full rounded-2xl border border-teal-200 bg-teal-50 px-5 py-4 text-left"
        >
          <p className="text-sm font-medium text-teal-800">去兑奖</p>
          <p className="mt-1 text-lg font-semibold tracking-tight text-teal-950">
            最近几期共 {formatYuan(payload?.totalAmount ?? 0)}
          </p>
          <ul className="mt-2 space-y-1 text-sm text-teal-900">
            {hits.slice(0, 4).map((hit) => (
              <li key={`${hit.issue}-${hit.ticketId}`}>
                第{hit.issue}期 {hit.ticketName} {hit.levelName} {formatYuan(hit.amount)}
                {hit.paidEnd ? ` · 兑到 ${hit.paidEnd}` : ""}
              </li>
            ))}
          </ul>
        </button>
      ) : null}

      {showPanel ? (
        <div className="mt-3 rounded-2xl border border-dashed border-zinc-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold">大乐透</h2>
              <p className="mt-1 text-sm text-zinc-500">
                号码存在这台服务器。开奖后自动对奖，中了会用 Server酱推到微信 / App。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={btnClass}
                onClick={() => void load(true).catch((err) => setError(err instanceof Error ? err.message : "刷新失败"))}
              >
                刷新开奖
              </button>
              <button
                type="button"
                className={btnClass}
                disabled={pending}
                onClick={() => {
                  setPending(true);
                  setError("");
                  setNotice("");
                  void fetch("/api/dlt", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ action: "test" }),
                  })
                    .then(async (res) => {
                      const body = (await res.json()) as { error?: string };
                      if (!res.ok) throw new Error(body.error || "推送失败");
                      setNotice("测试推送已发出，看微信和 Server酱 App");
                    })
                    .catch((err) => setError(err instanceof Error ? err.message : "推送失败"))
                    .finally(() => setPending(false));
                }}
              >
                测推送
              </button>
            </div>
          </div>

          {latest ? (
            <p className="mt-4 text-sm text-zinc-600">
              第{latest.issue}期 {latest.date}{" "}
              <span className="ml-2 inline-block align-middle">
                <Balls nums={latest.front} tone="front" />
              </span>
              <span className="ml-1 inline-block align-middle">
                <Balls nums={latest.back} tone="back" />
              </span>
            </p>
          ) : (
            <p className="mt-4 text-sm text-zinc-400">还没拉到开奖</p>
          )}

          {hits.length ? (
            <div className="mt-4 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3">
              <p className="font-medium text-teal-950">
                中奖 {hits.length} 注，共 {formatYuan(payload?.totalAmount ?? 0)}
              </p>
              <p className="mt-1 text-xs text-teal-800">1 万以下网点兑，1 万以上去体彩中心；60 天内有效。</p>
              <ul className="mt-2 space-y-2 text-sm text-teal-950">
                {hits.map((hit) => (
                  <li key={`${hit.issue}-${hit.ticketId}`}>
                    <p>
                      第{hit.issue}期 {hit.ticketName} · {hit.levelName} {formatYuan(hit.amount)}
                    </p>
                    <p className="mt-1">
                      <Balls
                        nums={payload?.tickets.find((t) => t.id === hit.ticketId)?.front ?? hit.matchedFront}
                        mark={hit.matchedFront}
                        tone="front"
                      />
                      <span className="mx-1" />
                      <Balls
                        nums={payload?.tickets.find((t) => t.id === hit.ticketId)?.back ?? hit.matchedBack}
                        mark={hit.matchedBack}
                        tone="back"
                      />
                      {hit.paidEnd ? <span className="ml-2 text-xs text-teal-800">兑到 {hit.paidEnd}</span> : null}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : payload?.tickets.length ? (
            <p className="mt-4 text-sm text-zinc-400">最近几期没中。</p>
          ) : null}

          <form onSubmit={(e) => void save(e)} className="mt-5 space-y-3">
            {drafts.map((row, index) => (
              <div key={row.id} className="grid gap-2 rounded-xl border border-zinc-200 p-3 sm:grid-cols-12">
                <input
                  value={row.name}
                  onChange={(e) => updateDraft(index, { name: e.target.value })}
                  className={`${fieldClass} sm:col-span-2`}
                  placeholder="注名"
                />
                <input
                  value={row.front}
                  onChange={(e) => updateDraft(index, { front: e.target.value })}
                  className={`${fieldClass} font-mono sm:col-span-5`}
                  placeholder="前区 5 个，如 01 08 12 24 33"
                />
                <input
                  value={row.back}
                  onChange={(e) => updateDraft(index, { back: e.target.value })}
                  className={`${fieldClass} font-mono sm:col-span-3`}
                  placeholder="后区 如 03 09"
                />
                <label className="flex items-center gap-1.5 text-sm text-zinc-600 sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={row.append}
                    onChange={(e) => updateDraft(index, { append: e.target.checked })}
                  />
                  追加
                </label>
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              <button type="submit" disabled={pending} className={primaryBtnClass}>
                保存两注
              </button>
              {drafts.length < 6 ? (
                <button
                  type="button"
                  className={btnClass}
                  onClick={() => setDrafts((rows) => [...rows, emptyDraft(rows.length)])}
                >
                  再加一注
                </button>
              ) : null}
            </div>
          </form>

          {notice ? <p className="mt-3 text-sm text-teal-700">{notice}</p> : null}
          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
