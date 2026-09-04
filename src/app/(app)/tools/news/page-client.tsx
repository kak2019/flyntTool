"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { NEWS_GROUPS, flashClock, relativeTime, type NewsGroup, type NewsPayload } from "@/lib/news-sources";
import { btnClass, fieldClass, primaryBtnClass } from "@/lib/styles";

export default function NewsPage() {
  const [data, setData] = useState<NewsPayload | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(true);
  const [group, setGroup] = useState<NewsGroup | "all">("finance");
  const [sourceId, setSourceId] = useState("all");
  const [query, setQuery] = useState("");
  const [importantOnly, setImportantOnly] = useState(false);

  const load = useCallback(async (refresh = false) => {
    setPending(true);
    setError("");
    try {
      const res = await fetch(refresh ? "/api/news?refresh=1" : "/api/news");
      const body = (await res.json()) as NewsPayload & { error?: string };
      if (!res.ok) throw new Error(body.error || "加载失败");
      setData(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setPending(false);
    }
  }, []);

  useEffect(() => {
    void load(false);
  }, [load]);

  const sourceOptions = useMemo(() => {
    const list = data?.sources ?? [];
    return group === "all" ? list : list.filter((source) => source.group === group);
  }, [data, group]);

  const items = useMemo(() => {
    const list = (data?.sources ?? []).flatMap((source) => source.items);
    const filtered = list
      .filter((item) => (group === "all" ? true : item.group === group))
      .filter((item) => (sourceId === "all" ? true : item.sourceId === sourceId))
      .filter((item) => {
        const q = query.trim().toLowerCase();
        if (!q) return true;
        return item.title.toLowerCase().includes(q) || item.summary.toLowerCase().includes(q);
      })
      .filter((item) => (importantOnly ? item.important : true))
      .sort((a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0));

    if (group !== "all" || sourceId !== "all" || query.trim()) return filtered;

    const seen = new Map<string, number>();
    return filtered.filter((item) => {
      const n = seen.get(item.sourceId) ?? 0;
      if (n >= 5) return false;
      seen.set(item.sourceId, n + 1);
      return true;
    });
  }, [data, group, sourceId, query, importantOnly]);

  const failed = (data?.sources ?? []).filter((source) => !source.ok);

  function pickGroup(next: NewsGroup | "all") {
    setGroup(next);
    setSourceId("all");
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">新闻聚合</h1>
          <p className="mt-1 text-sm text-zinc-500">
            金十快讯用他们页面同一套接口，大约 45 秒刷新；其它源仍是 RSS。点标题去原站。
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load(true)}
          disabled={pending}
          className={primaryBtnClass}
        >
          {pending ? "加载中…" : "刷新"}
        </button>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {NEWS_GROUPS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => pickGroup(item.id)}
            className={
              group === item.id ? `${btnClass} border-teal-700 bg-teal-50 text-teal-800` : btnClass
            }
          >
            {item.name}
          </button>
        ))}
        <label className="flex items-center gap-1.5 text-sm text-zinc-600">
          <input
            type="checkbox"
            checked={importantOnly}
            onChange={(e) => setImportantOnly(e.target.checked)}
          />
          只看重要
        </label>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜标题"
          className={`${fieldClass} ml-auto max-w-56`}
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setSourceId("all")}
          className={`rounded-lg px-2.5 py-1 text-xs ${
            sourceId === "all" ? "bg-teal-50 font-medium text-teal-800" : "text-zinc-500 hover:bg-zinc-50"
          }`}
        >
          全部来源
        </button>
        {sourceOptions.map((source) => (
          <button
            key={source.id}
            type="button"
            onClick={() => setSourceId(source.id)}
            className={`rounded-lg px-2.5 py-1 text-xs ${
              sourceId === source.id
                ? "bg-teal-50 font-medium text-teal-800"
                : source.ok
                  ? "text-zinc-500 hover:bg-zinc-50"
                  : "text-zinc-300 line-through"
            }`}
          >
            {source.name}
          </button>
        ))}
      </div>

      {data?.fetchedAt ? (
        <p className="mt-3 text-xs text-zinc-400">
          更新于 {relativeTime(data.fetchedAt)}
          {failed.length ? ` · ${failed.map((s) => s.name).join("、")} 暂时拉不到` : ""}
        </p>
      ) : null}
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      <ul className="mt-4 divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        {items.length ? (
          items.map((item) => (
            <li key={item.id}>
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className={`block px-4 py-3.5 hover:bg-zinc-50 ${
                  item.important ? "border-l-4 border-l-teal-700 bg-teal-50/40" : ""
                }`}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-xs font-medium text-teal-700">
                    {item.sourceName}
                    {item.important ? " · 重要" : ""}
                  </p>
                  <p className="shrink-0 font-mono text-xs text-zinc-400">
                    {item.sourceId === "jin10"
                      ? flashClock(item.publishedAt)
                      : relativeTime(item.publishedAt)}
                  </p>
                </div>
                <h2
                  className={`mt-1 text-sm leading-6 ${
                    item.important ? "font-semibold text-zinc-900" : "font-medium text-zinc-900"
                  }`}
                >
                  {item.title}
                </h2>
                {item.summary ? (
                  <p className="mt-1 line-clamp-2 text-sm leading-6 text-zinc-500">{item.summary}</p>
                ) : null}
              </a>
            </li>
          ))
        ) : (
          <li className="px-4 py-10 text-center text-sm text-zinc-400">
            {pending ? "正在拉各个源…" : "这一栏暂时没有条目"}
          </li>
        )}
      </ul>
    </div>
  );
}
