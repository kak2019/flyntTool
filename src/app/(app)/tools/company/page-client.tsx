"use client";

import { useState } from "react";
import { fieldClass, primaryBtnClass } from "@/lib/styles";

type Candidate = {
  key: string;
  name: string;
  creditCode: string;
  status: string;
  legalPerson: string;
  matchType: string;
};

type Holder = {
  name: string;
  entityType: string;
  ratio: string;
  amount: string;
  parentName: string;
  depth: number;
};

type Line = { title: string; detail: string };

type Section = {
  title: string;
  text: string;
  lines: Line[];
  groups: { title: string; lines: Line[] }[];
  total: number;
  note: string;
};

type Profile = {
  name: string;
  summary: string;
  fields: { label: string; value: string }[];
  controllers?: { name: string; ratio: string }[];
  chains?: string[];
  chainNodes?: { name: string; via: string }[];
  holders?: Holder[];
  ownershipNote?: string;
  sections?: Section[];
};

type Reply = {
  note: string;
  candidates: Candidate[];
  profile: Profile | null;
  error: string;
};

type Turn =
  | { id: number; kind: "user"; text: string }
  | { id: number; kind: "reply"; reply: Reply };

let nextId = 1;

export default function CompanyPage() {
  const [name, setName] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);

  async function ask(text: string, body: Record<string, string>) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    const userId = nextId++;
    const replyId = nextId++;
    setTurns((prev) => [...prev, { id: userId, kind: "user", text: trimmed }]);
    setBusy(true);
    try {
      const res = await fetch("/api/company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as Reply & { error?: string };
      setTurns((prev) => [
        ...prev,
        {
          id: replyId,
          kind: "reply",
          reply: {
            note: data.note || "",
            candidates: data.candidates || [],
            profile: data.profile || null,
            error: data.error || (res.ok ? "" : "查公司失败"),
          },
        },
      ]);
    } catch {
      setTurns((prev) => [
        ...prev,
        { id: replyId, kind: "reply", reply: { note: "", candidates: [], profile: null, error: "网络中断了" } },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-3xl flex-col">
      <h1 className="text-2xl font-semibold tracking-tight">查公司</h1>
      <p className="mt-1 text-sm text-zinc-500">
        输入公司名。先对上是哪一家，再查工商、股东、主要人员、对外投资、公司发展，以及实控人、受益股东、控制权和关系。每个栏目成功返回扣 1 次。
      </p>

      <div className="mt-5 flex flex-1 flex-col gap-3">
        {turns.length === 0 ? (
          <p className="text-sm text-zinc-400">例如「小米科技有限责任公司」。多家同名时会先列出来，点一家再查。</p>
        ) : null}
        {turns.map((turn) =>
          turn.kind === "user" ? (
            <p key={turn.id} className="ml-auto max-w-[85%] rounded-2xl bg-teal-700 px-3 py-2 text-sm text-white">
              {turn.text}
            </p>
          ) : (
            <div key={turn.id} className="max-w-[95%] space-y-3 rounded-2xl border border-zinc-200 bg-white px-3 py-3 text-sm">
              {turn.reply.error ? <p className="text-red-700">{turn.reply.error}</p> : null}
              {turn.reply.note ? <p className="text-zinc-600">{turn.reply.note}</p> : null}
              {turn.reply.profile ? <ProfileCard profile={turn.reply.profile} /> : null}
              {turn.reply.candidates.length > 1 || (turn.reply.candidates.length === 1 && !turn.reply.profile) ? (
                <ul className="space-y-2">
                  {turn.reply.candidates.map((item) => (
                    <li key={item.key}>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => ask(item.name, { action: "detail", key: item.key, name: item.name })}
                        className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-left hover:bg-zinc-50 disabled:opacity-50"
                      >
                        <span className="font-medium text-zinc-900">{item.name}</span>
                        <span className="mt-0.5 block text-xs text-zinc-500">
                          {[item.status, item.legalPerson && `法人 ${item.legalPerson}`, item.creditCode, item.matchType]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ),
        )}
      </div>

      <form
        className="sticky bottom-0 mt-4 flex gap-2 bg-zinc-50 py-3"
        onSubmit={(e) => {
          e.preventDefault();
          const text = name;
          setName("");
          void ask(text, { name: text });
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="公司名"
          className={fieldClass}
          disabled={busy}
        />
        <button type="submit" className={primaryBtnClass} disabled={busy || name.trim().length < 2}>
          {busy ? "查询中" : "查询"}
        </button>
      </form>
    </div>
  );
}

function ProfileCard({ profile }: { profile: Profile }) {
  return (
    <div>
      <p className="font-medium text-zinc-900">{profile.name}</p>
      {profile.summary ? <p className="mt-1 text-zinc-600">{profile.summary}</p> : null}
      {profile.fields.length ? (
        <dl className="mt-3 space-y-2">
          {profile.fields.map((field) => (
            <div key={field.label}>
              <dt className="text-xs text-zinc-400">{field.label}</dt>
              <dd className="whitespace-pre-wrap text-zinc-800">{field.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="mt-2 text-zinc-500">工商接口没有返回可展示的字段。</p>
      )}
      <Ownership profile={profile} />
      {(profile.sections ?? []).map((section) => (
        <SectionBlock key={section.title} section={section} />
      ))}
    </div>
  );
}

function SectionBlock({ section }: { section: Section }) {
  const more = section.total > section.lines.length && !section.groups.length;
  return (
    <section className="mt-4 border-t border-zinc-100 pt-3">
      <h2 className="text-xs text-zinc-400">
        {section.title}
        {section.total > 0 ? ` · ${section.total}` : ""}
      </h2>
      {section.note ? <p className={`mt-1 ${section.note.includes("失败") || section.note.includes("会员") || section.note.includes("额度") ? "text-red-700" : "text-zinc-500"}`}>{section.note}</p> : null}
      {section.text ? <p className="mt-1 max-h-36 overflow-auto whitespace-pre-wrap text-zinc-700">{section.text}</p> : null}
      <LineList lines={section.lines} />
      {section.groups.map((group) => (
        <div key={group.title} className="mt-2">
          <h3 className="text-xs text-zinc-500">{group.title}</h3>
          <LineList lines={group.lines} />
        </div>
      ))}
      {more ? <p className="mt-1 text-xs text-zinc-400">只列出前 {section.lines.length} 条</p> : null}
    </section>
  );
}

function LineList({ lines }: { lines: Line[] }) {
  if (!lines.length) return null;
  return (
    <ul className="mt-1 space-y-1">
      {lines.map((line) => (
        <li key={`${line.title}-${line.detail}`}>
          <span className="font-medium text-zinc-900">{line.title}</span>
          {line.detail ? <span className="text-zinc-500"> · {line.detail}</span> : null}
        </li>
      ))}
    </ul>
  );
}

function Ownership({ profile }: { profile: Profile }) {
  const controllers = profile.controllers ?? [];
  const chains = profile.chains ?? [];
  const holders = profile.holders ?? [];
  const roots = new Set(holders.map((item) => item.parentName).filter((name) => name && !holders.some((item) => item.name === name)));
  if (!controllers.length && !chains.length && !holders.length && !profile.ownershipNote) return null;
  return (
    <div className="mt-4 space-y-3 border-t border-zinc-100 pt-3">
      {profile.ownershipNote ? <p className="text-red-700">{profile.ownershipNote}</p> : null}
      {controllers.length ? (
        <section>
          <h2 className="text-xs text-zinc-400">实际控制人</h2>
          <ul className="mt-1 space-y-1">
            {controllers.map((item) => (
              <li key={item.name}>
                <span className="font-medium text-zinc-900">{item.name}</span>
                {item.ratio ? <span className="text-zinc-500"> · {item.ratio}</span> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {(profile.chainNodes ?? []).length > 1 ? (
        <section>
          <h2 className="text-xs text-zinc-400">股权穿透图</h2>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {(profile.chainNodes ?? []).map((node, index) => (
              <span key={`${node.name}-${index}`} className="flex items-center gap-1.5">
                {node.via ? <span className="text-xs text-teal-800">{node.via} →</span> : null}
                <span className="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1 text-zinc-900">{node.name}</span>
              </span>
            ))}
          </div>
        </section>
      ) : chains.length ? (
        <section>
          <h2 className="text-xs text-zinc-400">股权穿透图</h2>
          <ul className="mt-1 space-y-1">
            {chains.map((chain) => (
              <li key={chain} className="text-zinc-800">
                {chain}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {holders.length ? (
        <section>
          <h2 className="text-xs text-zinc-400">股权结构全景</h2>
          {[...roots].map((root) => (
            <HolderBranch key={root} parent={root} holders={holders} />
          ))}
        </section>
      ) : null}
    </div>
  );
}

function HolderBranch({ parent, holders }: { parent: string; holders: Holder[] }) {
  const children = holders.filter((item) => item.parentName === parent);
  if (!children.length) return null;
  return (
    <ul className="mt-1 space-y-1 border-l border-zinc-200 pl-3">
      {children.map((item) => (
        <li key={`${item.depth}-${item.parentName}-${item.name}`}>
          <span className="font-medium text-zinc-900">{item.name}</span>
          <span className="text-zinc-500">
            {" "}
            {[item.entityType, item.ratio, item.amount].filter(Boolean).join(" · ")}
          </span>
          <HolderBranch parent={item.name} holders={holders} />
        </li>
      ))}
    </ul>
  );
}
