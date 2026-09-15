"use client";

import { useEffect, useState } from "react";
import { DltPanel } from "@/components/DltPanel";
import { ToolCardGrid } from "@/components/ToolCardGrid";
import { WatchlistPanel } from "@/components/WatchlistPanel";
import { loadToolOrder, orderedTools, saveToolOrder, swapIds, type ToolOrderMap } from "@/lib/tool-order";
import { toolCategories, toolsIn, type ToolCategoryId } from "@/lib/tools";
import { btnClass, primaryBtnClass } from "@/lib/styles";

export function ToolBoard() {
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState<ToolOrderMap>({});
  const [draft, setDraft] = useState<ToolOrderMap>({});

  useEffect(() => {
    const loaded = loadToolOrder();
    setSaved(loaded);
    setDraft(loaded);
  }, []);

  const order = editing ? draft : saved;

  function startEdit() {
    setDraft({ ...saved });
    setEditing(true);
  }

  function save() {
    saveToolOrder(draft);
    setSaved(draft);
    setEditing(false);
  }

  function cancel() {
    setDraft(saved);
    setEditing(false);
  }

  function resetDraft() {
    setDraft({});
  }

  function swap(category: ToolCategoryId, from: string, to: string) {
    setDraft((prev) => ({
      ...prev,
      [category]: swapIds(
        orderedTools(toolsIn(category), prev[category]).map((tool) => tool.id),
        from,
        to,
      ),
    }));
  }

  return (
    <div>
      <p className="text-sm font-medium text-teal-700">tool.flynt.top</p>
      <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">个人工具箱</h1>
          <p className="mt-2 max-w-xl text-zinc-500">
            {editing ? "拖动卡片互换位置，保存后才会记住。点取消则还原。" : "给自己用的小工具，顶部可以直接切换。"}
          </p>
        </div>
        {editing ? (
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={resetDraft} className={btnClass}>
              恢复默认
            </button>
            <button type="button" onClick={cancel} className={btnClass}>
              取消
            </button>
            <button type="button" onClick={save} className={primaryBtnClass}>
              保存
            </button>
          </div>
        ) : (
          <button type="button" onClick={startEdit} className={btnClass}>
            调整布局
          </button>
        )}
      </div>

      {toolCategories.map((category) => (
        <section key={category.id} className="mt-8">
          <h2 className="text-sm font-medium text-zinc-500">{category.name}</h2>
          <div className="mt-3">
            <ToolCardGrid
              tools={orderedTools(toolsIn(category.id), order[category.id])}
              editing={editing}
              onSwap={(from, to) => swap(category.id, from, to)}
            />
          </div>
          {category.id === "life" ? <DltPanel /> : null}
        </section>
      ))}

      <WatchlistPanel />
    </div>
  );
}
